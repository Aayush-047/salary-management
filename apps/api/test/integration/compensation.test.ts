import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedReference } from "../../prisma/seed/seed-reference.js";
import { createApp } from "../../src/app.js";
import { resetDatabase, testPrisma } from "./helpers/db.js";
import { createEmployees } from "./helpers/fixtures.js";

const app = createApp({
  corsOrigin: "http://localhost:5173",
  prisma: testPrisma,
  clock: () => new Date("2026-11-01T12:00:00Z"),
});

/** Ben (E00005), QA Engineer L2 in Germany: hired 2022-03-01 at €50k, merit on 2024-04-01 to €53k. */
beforeEach(async () => {
  await resetDatabase();
  await seedReference(testPrisma);
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
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

const entries = () => testPrisma.compensationEntry.findMany({ orderBy: { effectiveDate: "asc" } });
const auditRows = () => testPrisma.auditLog.findMany({ orderBy: { id: "asc" } });
const changePay = (body: object) => request(app).post("/employees/E00005/compensation").send(body);
const MERIT = {
  effectiveDate: "2025-04-01",
  baseSalary: 56_000,
  targetBonus: 3_900,
  reason: "MERIT",
};

describe("POST /employees/:code/compensation", () => {
  it("adds a pay entry, updates current pay and audits old → new", async () => {
    const res = await changePay({ ...MERIT, note: "Annual review" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ baseSalary: 56_000, targetBonus: 3_900, currency: "EUR" });
    expect(res.body.compensation[0]).toMatchObject({
      effectiveDate: "2025-04-01",
      reason: "MERIT",
      baseChangePct: 0.0566,
      note: "Annual review",
    });
    const [audit] = await auditRows();
    expect(audit).toMatchObject({
      entityType: "COMPENSATION_ENTRY",
      action: "CREATE",
      reason: "Annual review",
    });
    expect(audit?.changes).toEqual([
      { field: "payReason", from: null, to: "MERIT" },
      { field: "effectiveDate", from: null, to: "2025-04-01" },
      { field: "baseSalary", from: 53_000, to: 56_000 },
      { field: "targetBonus", from: 3_700, to: 3_900 },
    ]);
  });

  it("records a promotion's level and title change in the same audit entry", async () => {
    const res = await changePay({
      ...MERIT,
      reason: "PROMOTION",
      newLevel: 3,
      newJobTitle: "Software Engineer",
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      level: 3,
      jobTitle: "Software Engineer",
      department: "Engineering",
    });
    const [audit] = await auditRows();
    expect(audit?.changes).toEqual(
      expect.arrayContaining([
        { field: "level", from: 2, to: 3 },
        { field: "jobTitle", from: "QA Engineer", to: "Software Engineer" },
      ]),
    );
  });

  it.each([
    {
      name: "a promotion that lowers the level",
      body: { ...MERIT, reason: "PROMOTION", newLevel: 1 },
      code: "PROMOTION_LOWERS_LEVEL",
    },
    {
      name: "a promotion that changes nothing",
      body: { ...MERIT, reason: "PROMOTION", newLevel: 2 },
      code: "PROMOTION_WITHOUT_CHANGE",
    },
    {
      name: "a date on the latest entry's day",
      body: { ...MERIT, effectiveDate: "2024-04-01" },
      code: "NOT_AFTER_LATEST_ENTRY",
    },
    {
      name: "a backdated date",
      body: { ...MERIT, effectiveDate: "2023-01-01" },
      code: "NOT_AFTER_LATEST_ENTRY",
    },
    { name: "a future date", body: { ...MERIT, effectiveDate: "2026-11-03" }, code: "FUTURE_DATE" },
  ])("rejects $name (422 $code) and writes nothing", async ({ body, code }) => {
    const res = await changePay(body);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe(code);
    expect(await entries()).toHaveLength(2);
    expect(await auditRows()).toEqual([]);
  });

  it("refuses pay changes for someone who has left", async () => {
    await request(app)
      .post("/employees/E00005/terminate")
      .send({ terminationDate: "2026-10-31", note: "Resigned" });

    const res = await changePay(MERIT);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMPLOYEE_TERMINATED");
  });
});

describe("PATCH /compensation/:id (corrections)", () => {
  const entryOn = async (date: string) =>
    (await entries()).find((e) => e.effectiveDate.toISOString().startsWith(date))!;

  it("corrects the latest entry and updates current pay", async () => {
    const merit = await entryOn("2024-04-01");
    const res = await request(app)
      .patch(`/compensation/${merit.id}`)
      .send({ baseSalary: 55_000, note: "Typed 53,000 instead of 55,000" });

    expect(res.status).toBe(200);
    expect(res.body.baseSalary).toBe(55_000);
    const [audit] = await auditRows();
    expect(audit).toMatchObject({
      entityType: "COMPENSATION_ENTRY",
      entityId: merit.id,
      action: "UPDATE",
      changes: [{ field: "baseSalary", from: 53_000, to: 55_000 }],
      reason: "Typed 53,000 instead of 55,000",
    });
  });

  it("corrects an older entry without changing current pay", async () => {
    const hire = await entryOn("2022-03-01");
    const res = await request(app)
      .patch(`/compensation/${hire.id}`)
      .send({ baseSalary: 51_000, note: "Offer letter said 51,000" });

    expect(res.body.baseSalary).toBe(53_000);
    expect(res.body.compensation.at(-1).baseSalary).toBe(51_000);
  });

  it("moves an entry's date within its neighbours", async () => {
    const merit = await entryOn("2024-04-01");
    const res = await request(app)
      .patch(`/compensation/${merit.id}`)
      .send({ effectiveDate: "2024-03-15", note: "Effective mid-March" });

    expect(res.body.compensation[0].effectiveDate).toBe("2024-03-15");
  });

  it.each([
    {
      name: "moving a date onto the previous entry",
      change: { effectiveDate: "2022-03-01" },
      code: "NOT_AFTER_PREVIOUS_ENTRY",
    },
    {
      name: "moving a date into the future",
      change: { effectiveDate: "2026-12-01" },
      code: "FUTURE_DATE",
    },
    { name: "no actual change", change: { baseSalary: 53_000 }, code: "NO_CHANGES" },
  ])("rejects $name (422 $code)", async ({ change, code }) => {
    const merit = await entryOn("2024-04-01");
    const res = await request(app)
      .patch(`/compensation/${merit.id}`)
      .send({ ...change, note: "Correction" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe(code);
    expect(await auditRows()).toEqual([]);
  });

  it("does not move the hire entry's date (that is the hire date)", async () => {
    const hire = await entryOn("2022-03-01");
    const res = await request(app)
      .patch(`/compensation/${hire.id}`)
      .send({ effectiveDate: "2022-02-01", note: "Wrong start" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("HIRE_ENTRY_DATE");
  });

  it("still allows corrections after someone has left", async () => {
    await request(app)
      .post("/employees/E00005/terminate")
      .send({ terminationDate: "2026-10-31", note: "Resigned" });
    const merit = await entryOn("2024-04-01");

    const res = await request(app)
      .patch(`/compensation/${merit.id}`)
      .send({ targetBonus: 4_000, note: "Bonus was entered wrongly" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "TERMINATED", targetBonus: 4_000 });
  });

  it("returns 404 for an unknown entry and 400 for a malformed id", async () => {
    expect(
      (await request(app).patch("/compensation/999999").send({ baseSalary: 1, note: "Fix" }))
        .status,
    ).toBe(404);
    expect(
      (await request(app).patch("/compensation/abc").send({ baseSalary: 1, note: "Fix" })).status,
    ).toBe(400);
  });
});

describe("POST /employees/:code/relocate", () => {
  const RELOCATION = {
    countryCode: "GB",
    effectiveDate: "2025-06-01",
    baseSalary: 48_000,
    targetBonus: 3_400,
    note: "Moved to the London office",
  };

  it("changes country and records new pay in the new currency as one event", async () => {
    const res = await request(app).post("/employees/E00005/relocate").send(RELOCATION);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      country: { code: "GB", name: "United Kingdom" },
      baseSalary: 48_000,
      currency: "GBP",
    });
    expect(res.body.compensation[0]).toMatchObject({
      reason: "RELOCATION",
      currency: "GBP",
      baseChangePct: null, // no % across currencies
    });
    const [audit] = await auditRows();
    expect(audit?.changes).toEqual([
      { field: "effectiveDate", from: null, to: "2025-06-01" },
      { field: "country", from: "DE", to: "GB" },
      { field: "currency", from: "EUR", to: "GBP" },
      { field: "baseSalary", from: 53_000, to: 48_000 },
      { field: "targetBonus", from: 3_700, to: 3_400 },
    ]);
  });

  it("shows up in the list under the new country", async () => {
    await request(app).post("/employees/E00005/relocate").send(RELOCATION);

    const res = await request(app).get("/employees").query({ country: "GB" });

    expect(res.body.items.map((e: { employeeCode: string }) => e.employeeCode)).toEqual(["E00005"]);
  });

  it.each([
    { name: "the same country", change: { countryCode: "DE" }, code: "SAME_COUNTRY" },
    { name: "an unknown country", change: { countryCode: "CH" }, code: "UNKNOWN_COUNTRY" },
    {
      name: "a date not after the latest pay change",
      change: { effectiveDate: "2024-01-01" },
      code: "NOT_AFTER_LATEST_ENTRY",
    },
  ])("rejects $name (422 $code)", async ({ change, code }) => {
    const res = await request(app)
      .post("/employees/E00005/relocate")
      .send({ ...RELOCATION, ...change });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe(code);
  });
});
