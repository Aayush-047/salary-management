import { MAX_IMPORT_BYTES } from "@salary/shared";
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

const HEADER = "firstName,lastName,email,country,jobTitle,level,hireDate,baseSalary,targetBonus";
const VALID = [
  HEADER,
  "Lena,Fischer,lena@example.com,DE,Data Scientist,3,2026-01-15,78000,7800",
  'Raj,Iyer,raj@example.com,IN,Software Engineer,2,2025-06-01,"1,800,000",90000',
  "Mia,Tan,mia@example.com,SG,Product Manager,4,2024-09-09,140000,14000",
].join("\n");

const send = (path: string, body: string, filename = "staff.csv") =>
  request(app)
    .post(`/imports/employees${path}`)
    .query({ filename })
    .set("Content-Type", "text/csv")
    .send(body);
const counts = async () => ({
  employees: await testPrisma.employee.count(),
  entries: await testPrisma.compensationEntry.count(),
  audit: await testPrisma.auditLog.count(),
});

beforeEach(async () => {
  await resetDatabase();
  await seedReference(testPrisma);
  // Ben already exists as E00005.
  await createEmployees(testPrisma, [
    {
      employeeCode: "E00005",
      firstName: "Ben",
      lastName: "Weber",
      countryCode: "DE",
      jobTitle: "QA Engineer",
      level: 2,
      baseSalary: 50_000,
      targetBonus: 3_500,
    },
  ]);
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("POST /imports/employees/check", () => {
  it("reports a valid file with a per-country summary and saves nothing", async () => {
    const res = await send("/check", VALID);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      filename: "staff.csv",
      rows: 3,
      valid: true,
      errorCount: 0,
      errors: [],
      byCountry: [
        { code: "DE", name: "Germany", count: 1 },
        { code: "IN", name: "India", count: 1 },
        { code: "SG", name: "Singapore", count: 1 },
      ],
    });
    expect(await counts()).toEqual({ employees: 1, entries: 0, audit: 0 });
  });

  it("lists every problem with its row and column, people already in the system included", async () => {
    const res = await send(
      "/check",
      [
        HEADER,
        "Lena,Fischer,lena@example.com,DE,Data Scientist,3,2026-01-15,78000,7800",
        "Ben,Weber,BEN.WEBER@example.com,DE,QA Engineer,2,2022-01-10,50000,3500",
        "Ola,Nord,ola@example.com,CH,Astronaut,3,2026-12-01,78.000,0",
      ].join("\n"),
    );

    expect(res.body).toMatchObject({ rows: 3, valid: false, errorCount: 5 });
    expect(res.body.errors).toEqual([
      { row: 3, column: "email", message: "Already in the system as E00005" },
      {
        row: 4,
        column: "baseSalary",
        message: "Use a whole number without dots (78000 or 78,000)",
      },
      { row: 4, column: "country", message: 'Unknown country "CH"' },
      { row: 4, column: "jobTitle", message: 'Unknown job title "Astronaut"' },
      { row: 4, column: "hireDate", message: "Hire date 2026-12-01 is in the future" },
    ]);
  });

  it("lists at most 200 problems but reports the total", async () => {
    const rows = Array.from(
      { length: 250 },
      (_, i) => `P${i},X,p${i}@example.com,DE,Data Scientist,3,2026-01-15,abc,0`,
    );
    const res = await send("/check", [HEADER, ...rows].join("\n"));

    expect(res.body.errorCount).toBe(250);
    expect(res.body.errors).toHaveLength(200);
  });
});

describe("POST /imports/employees", () => {
  it("creates every employee with a hire entry and an audit entry naming the file", async () => {
    const res = await send("", VALID);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ imported: 3, firstCode: "E00006", lastCode: "E00008" });

    const raj = await testPrisma.employee.findUniqueOrThrow({
      where: { email: "raj@example.com" },
      include: { compensationEntries: true, auditLogs: true },
    });
    expect(raj).toMatchObject({
      employeeCode: "E00007",
      currentBaseSalary: 1_800_000,
      currentCurrency: "INR",
      compensationEntries: [
        expect.objectContaining({ reason: "HIRE", baseSalary: 1_800_000, currency: "INR" }),
      ],
      auditLogs: [expect.objectContaining({ action: "CREATE", reason: "Imported from staff.csv" })],
    });
    expect(await counts()).toEqual({ employees: 4, entries: 3, audit: 3 });
  });

  it("imports nothing if any row has a problem", async () => {
    const withOneBadRow = `${VALID}\nOla,Nord,ola@example.com,DE,Data Scientist,3,2026-01-15,abc,0`;
    const res = await send("", withOneBadRow);

    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({
      code: "IMPORT_INVALID",
      message: "The file has 1 problem; nothing was imported",
      details: {
        valid: false,
        errors: [{ row: 5, column: "baseSalary", message: "Enter an amount" }],
      },
    });
    expect(await counts()).toEqual({ employees: 1, entries: 0, audit: 0 });
  });

  it("re-checks at import time: a second import of the same file is rejected", async () => {
    await send("", VALID);
    const again = await send("", VALID);

    expect(again.status).toBe(422);
    expect(again.body.error.details.errors[0]).toEqual({
      row: 2,
      column: "email",
      message: "Already in the system as E00006",
    });
  });

  it("refreshes planner statistics after the bulk insert", async () => {
    await send("", VALID);

    const [employee] = await testPrisma.$queryRaw<{ reltuples: number }[]>`
      SELECT reltuples::int AS reltuples FROM pg_class WHERE relname = 'Employee'`;
    expect(employee?.reltuples).toBe(4);
  });
});

describe("upload limits", () => {
  it("rejects a file over 5 MB with a plain message", async () => {
    const res = await send("/check", `${HEADER}\n${"x".repeat(MAX_IMPORT_BYTES)}`);

    expect(res.status).toBe(413);
    expect(res.body.error).toEqual({
      code: "FILE_TOO_LARGE",
      message: "The file is larger than 5 MB",
    });
  });

  it("reports an empty upload like any other problem", async () => {
    const res = await request(app).post("/imports/employees/check");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      valid: false,
      rows: 0,
      errors: [{ row: null, column: null, message: "The file is empty" }],
    });
  });

  it("asks for a CSV file when the body is something else (e.g. JSON)", async () => {
    const res = await request(app).post("/imports/employees/check").send({ rows: [] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NO_FILE");
  });
});
