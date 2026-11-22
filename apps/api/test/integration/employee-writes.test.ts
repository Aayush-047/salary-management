import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedReference } from "../../prisma/seed/seed-reference.js";
import { createApp } from "../../src/app.js";
import { resetDatabase, testPrisma } from "./helpers/db.js";
import { createEmployees } from "./helpers/fixtures.js";

/** "Today" for every rule in these tests. */
const app = createApp({
  corsOrigin: "http://localhost:5173",
  prisma: testPrisma,
  clock: () => new Date("2026-11-01T12:00:00Z"),
});

const NEW_EMPLOYEE = {
  firstName: "Lena",
  lastName: "Fischer",
  email: "lena.fischer@example.com",
  countryCode: "DE",
  jobTitle: "Data Scientist",
  level: 3,
  hireDate: "2026-10-01",
  baseSalary: 78_000,
  targetBonus: 7_800,
  note: "Signed offer #1234",
};

/** Ben (E00005): hired 2022-03-01, one later pay change on 2024-04-01. */
async function seedBen() {
  await createEmployees(testPrisma, [
    {
      employeeCode: "E00005",
      firstName: "Ben",
      lastName: "Weber",
      countryCode: "DE",
      jobTitle: "QA Engineer",
      level: 2,
      baseSalary: 53_000,
      targetBonus: 3_700,
      hireDate: "2022-03-01",
    },
  ]);
  const ben = await testPrisma.employee.findUniqueOrThrow({ where: { employeeCode: "E00005" } });
  await testPrisma.compensationEntry.createMany({
    data: [
      {
        employeeId: ben.id,
        effectiveDate: new Date("2022-03-01"),
        baseSalary: 50_000,
        targetBonus: 3_500,
        currency: "EUR",
        reason: "HIRE",
      },
      {
        employeeId: ben.id,
        effectiveDate: new Date("2024-04-01"),
        baseSalary: 53_000,
        targetBonus: 3_700,
        currency: "EUR",
        reason: "MERIT",
      },
    ],
  });
}

const auditRows = () => testPrisma.auditLog.findMany({ orderBy: { id: "asc" } });

beforeEach(async () => {
  await resetDatabase();
  await seedReference(testPrisma);
  await seedBen();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("POST /employees", () => {
  it("names the hire date in its own words when it is in the future", async () => {
    const res = await request(app)
      .post("/employees")
      .send({ ...NEW_EMPLOYEE, hireDate: "2026-11-03" });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toBe("Hire date 2026-11-03 is in the future");
  });

  it("accepts a hire date that is already today east of UTC", async () => {
    // The test clock is 2026-11-01 12:00 UTC: it is already the 2nd in UTC+14.
    const res = await request(app)
      .post("/employees")
      .send({ ...NEW_EMPLOYEE, hireDate: "2026-11-02" });

    expect(res.status).toBe(201);
  });

  it("creates the employee, the HIRE pay entry and a CREATE audit entry", async () => {
    const res = await request(app).post("/employees").send(NEW_EMPLOYEE);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      employeeCode: "E00006", // next after the highest existing code
      country: { code: "DE" },
      department: "Data",
      baseSalary: 78_000,
      currency: "EUR",
      status: "ACTIVE",
      compensation: [
        {
          effectiveDate: "2026-10-01",
          reason: "HIRE",
          baseSalary: 78_000,
          note: "Signed offer #1234",
        },
      ],
    });
    const [audit] = await auditRows();
    expect(audit).toMatchObject({ action: "CREATE", reason: "Signed offer #1234" });
    expect(audit?.changes).toContainEqual({ field: "baseSalary", from: null, to: 78_000 });
    expect(audit?.changes).toContainEqual({ field: "hireDate", from: null, to: "2026-10-01" });
  });

  it.each([
    {
      name: "an unknown job title",
      change: { jobTitle: "Astronaut" },
      status: 422,
      code: "UNKNOWN_JOB_TITLE",
    },
    {
      name: "an unknown country",
      change: { countryCode: "CH" },
      status: 422,
      code: "UNKNOWN_COUNTRY",
    },
    {
      name: "an email already in use",
      change: { email: "ben.weber@example.com" },
      status: 409,
      code: "EMAIL_TAKEN",
    },
    {
      name: "a future hire date",
      change: { hireDate: "2026-11-03" },
      status: 422,
      code: "FUTURE_DATE",
    },
    { name: "invalid input", change: { baseSalary: -5 }, status: 400, code: "VALIDATION_ERROR" },
  ])("rejects $name ($status $code) and writes nothing", async ({ change, status, code }) => {
    const res = await request(app)
      .post("/employees")
      .send({ ...NEW_EMPLOYEE, ...change });

    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
    expect(await testPrisma.employee.count()).toBe(1);
    expect(await auditRows()).toEqual([]);
  });
});

describe("PATCH /employees/:code", () => {
  it("updates the changed fields and audits only those", async () => {
    const res = await request(app)
      .patch("/employees/E00005")
      .send({ level: 3, lastName: "Webber", firstName: "Ben", note: "Corrected after HR review" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ level: 3, lastName: "Webber" });
    const [audit] = await auditRows();
    expect(audit).toMatchObject({ action: "UPDATE", reason: "Corrected after HR review" });
    expect(audit?.changes).toEqual([
      { field: "lastName", from: "Weber", to: "Webber" },
      { field: "level", from: 2, to: 3 },
    ]);
  });

  it("changes job title by name and reports the new department", async () => {
    const res = await request(app)
      .patch("/employees/E00005")
      .send({ jobTitle: "Data Analyst", note: "Moved to the data team" });

    expect(res.body).toMatchObject({ jobTitle: "Data Analyst", department: "Data" });
  });

  it("moves the HIRE pay entry together with the hire date", async () => {
    const res = await request(app)
      .patch("/employees/E00005")
      .send({ hireDate: "2022-02-14", note: "Start date was wrong" });

    expect(res.status).toBe(200);
    expect(res.body.hireDate).toBe("2022-02-14");
    expect(res.body.compensation.at(-1)).toMatchObject({
      reason: "HIRE",
      effectiveDate: "2022-02-14",
    });
  });

  it.each([
    {
      name: "no actual change",
      body: { level: 2, note: "Same level" },
      status: 422,
      code: "NO_CHANGES",
    },
    {
      name: "a hire date after the first pay change",
      body: { hireDate: "2024-05-01", note: "Wrong" },
      status: 422,
      code: "HIRE_AFTER_PAY_CHANGE",
    },
    {
      name: "an unknown job title",
      body: { jobTitle: "Astronaut", note: "Typo" },
      status: 422,
      code: "UNKNOWN_JOB_TITLE",
    },
    { name: "a missing reason", body: { level: 3 }, status: 400, code: "VALIDATION_ERROR" },
  ])("rejects $name ($status $code) and writes no audit", async ({ body, status, code }) => {
    const res = await request(app).patch("/employees/E00005").send(body);

    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
    expect(await auditRows()).toEqual([]);
  });

  it("rejects an email used by someone else", async () => {
    await request(app).post("/employees").send(NEW_EMPLOYEE);
    const res = await request(app)
      .patch("/employees/E00005")
      .send({ email: "lena.fischer@example.com", note: "Typo" });

    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: "EMAIL_TAKEN",
      message: "lena.fischer@example.com is already used by E00006",
    });
  });

  it("returns 404 for an unknown employee", async () => {
    const res = await request(app).patch("/employees/E99999").send({ level: 3, note: "Promote" });
    expect(res.status).toBe(404);
  });
});

describe("POST /employees/:code/terminate", () => {
  it("terminates the employee and audits the status change", async () => {
    const res = await request(app)
      .post("/employees/E00005/terminate")
      .send({ terminationDate: "2026-10-31", note: "Resigned" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "TERMINATED", terminationDate: "2026-10-31" });
    const [audit] = await auditRows();
    expect(audit).toMatchObject({
      action: "TERMINATE",
      reason: "Resigned",
      changes: [
        { field: "status", from: "ACTIVE", to: "TERMINATED" },
        { field: "terminationDate", from: null, to: "2026-10-31" },
      ],
    });
  });

  it.each([
    { name: "before the latest pay change", date: "2024-03-31", code: "BEFORE_LATEST_PAY_CHANGE" },
    { name: "in the future", date: "2026-11-03", code: "FUTURE_DATE" },
  ])("rejects a termination date $name", async ({ date, code }) => {
    const res = await request(app)
      .post("/employees/E00005/terminate")
      .send({ terminationDate: date, note: "Resigned" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe(code);
  });

  it("refuses to terminate twice, and freezes the profile afterwards", async () => {
    await request(app)
      .post("/employees/E00005/terminate")
      .send({ terminationDate: "2026-10-31", note: "Resigned" });

    const again = await request(app)
      .post("/employees/E00005/terminate")
      .send({ terminationDate: "2026-10-31", note: "Again" });
    const edit = await request(app)
      .patch("/employees/E00005")
      .send({ level: 3, note: "Late promotion" });

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("ALREADY_TERMINATED");
    expect(edit.status).toBe(409);
    expect(edit.body.error.code).toBe("EMPLOYEE_TERMINATED");
  });
});
