import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedReference } from "../../prisma/seed/seed-reference.js";
import { createApp } from "../../src/app.js";
import { resetDatabase, testPrisma } from "./helpers/db.js";
import { createEmployees } from "./helpers/fixtures.js";

/*
 * Test clock: 2026-11-01 12:00 UTC, so the default period is 2025-11-03 to 2026-11-02.
 *
 * Anna (DE): hire 2022 · merit 2025-04-01 +5% (before the period) · promotion 2026-03-01 +10%
 * Ben (DE):  hire 2022 · market adjustment 2026-06-01 +5%
 * Carla (US): hired 2025-12-01 (a hire, not a raise)
 * Daisuke (JP → GB): relocation 2026-02-01 (currency changed: no % possible)
 * George (GB, left): merit 2026-01-01 +3% (excluded unless leavers are included)
 */
const app = createApp({
  corsOrigin: "http://localhost:5173",
  prisma: testPrisma,
  clock: () => new Date("2026-11-01T12:00:00Z"),
});

const HISTORY: Record<string, [date: string, base: number, currency: string, reason: string][]> = {
  E00001: [
    ["2022-03-01", 70_000, "EUR", "HIRE"],
    ["2025-04-01", 73_500, "EUR", "MERIT"],
    ["2026-03-01", 80_850, "EUR", "PROMOTION"],
  ],
  E00002: [
    ["2022-03-01", 53_000, "EUR", "HIRE"],
    ["2026-06-01", 55_650, "EUR", "MARKET_ADJUSTMENT"],
  ],
  E00003: [["2025-12-01", 100_000, "USD", "HIRE"]],
  E00004: [
    ["2023-01-10", 10_000_000, "JPY", "HIRE"],
    ["2026-02-01", 60_000, "GBP", "RELOCATION"],
  ],
  E00005: [
    ["2022-01-10", 40_000, "GBP", "HIRE"],
    ["2026-01-01", 41_200, "GBP", "MERIT"],
  ],
};

beforeAll(async () => {
  await resetDatabase();
  await seedReference(testPrisma);
  await createEmployees(testPrisma, [
    {
      employeeCode: "E00001",
      firstName: "Anna",
      lastName: "Schmidt",
      countryCode: "DE",
      jobTitle: "Software Engineer",
      level: 4,
      baseSalary: 80_850,
      targetBonus: 8_000,
    },
    {
      employeeCode: "E00002",
      firstName: "Ben",
      lastName: "Weber",
      countryCode: "DE",
      jobTitle: "QA Engineer",
      level: 2,
      baseSalary: 55_650,
      targetBonus: 3_900,
    },
    {
      employeeCode: "E00003",
      firstName: "Carla",
      lastName: "Diaz",
      countryCode: "US",
      jobTitle: "Software Engineer",
      level: 3,
      baseSalary: 100_000,
      targetBonus: 10_000,
      hireDate: "2025-12-01",
    },
    {
      employeeCode: "E00004",
      firstName: "Daisuke",
      lastName: "Sato",
      countryCode: "GB",
      jobTitle: "Software Engineer",
      level: 3,
      baseSalary: 60_000,
      targetBonus: 6_000,
      hireDate: "2023-01-10",
    },
    {
      employeeCode: "E00005",
      firstName: "George",
      lastName: "Hall",
      countryCode: "GB",
      jobTitle: "Recruiter",
      level: 2,
      baseSalary: 41_200,
      targetBonus: 2_800,
      terminationDate: "2026-09-30",
    },
  ]);
  const employees = await testPrisma.employee.findMany();
  const idOf = new Map(employees.map((e) => [e.employeeCode, e.id]));
  await testPrisma.compensationEntry.createMany({
    data: Object.entries(HISTORY).flatMap(([code, entries]) =>
      entries.map(([date, baseSalary, currency, reason]) => ({
        employeeId: idOf.get(code)!,
        effectiveDate: new Date(date),
        baseSalary,
        targetBonus: Math.round(baseSalary / 10),
        currency,
        reason: reason as "HIRE",
      })),
    ),
  });
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

const recent = (query: Record<string, string> = {}) =>
  request(app).get("/insights/recent-changes").query(query);

describe("GET /insights/recent-changes", () => {
  it("defaults to the last 12 months and counts only real raises of active employees", async () => {
    const res = await recent();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      from: "2025-11-03",
      to: "2026-11-02",
      summary: { changes: 2, employees: 2, averageRaisePct: 0.075, medianRaisePct: 0.075 },
      byReason: [
        { reason: "MARKET_ADJUSTMENT", changes: 1, averageRaisePct: 0.05 },
        { reason: "PROMOTION", changes: 1, averageRaisePct: 0.1 },
      ],
    });
  });

  it("lists the largest raises first with before and after pay", async () => {
    const res = await recent();

    expect(res.body.topRaises).toEqual([
      {
        employeeCode: "E00001",
        firstName: "Anna",
        lastName: "Schmidt",
        effectiveDate: "2026-03-01",
        reason: "PROMOTION",
        previousBase: 73_500,
        newBase: 80_850,
        currency: "EUR",
        raisePct: 0.1,
      },
      expect.objectContaining({ employeeCode: "E00002", raisePct: 0.05 }),
    ]);
  });

  it("compares with the previous entry even when it is before the period", async () => {
    const res = await recent({ from: "2025-01-01", to: "2026-12-31" });

    // Adds Anna's merit raise of 2025-04-01 (+5% on her 2022 hire pay).
    expect(res.body.summary).toEqual({
      changes: 3,
      employees: 2,
      averageRaisePct: 0.0667,
      medianRaisePct: 0.05,
    });
  });

  it("includes leavers when asked", async () => {
    const res = await recent({ status: "ALL" });

    expect(res.body.summary.changes).toBe(3);
    expect(res.body.topRaises.map((r: { employeeCode: string }) => r.employeeCode)).toContain(
      "E00005",
    );
  });

  it("applies the employee filters and reports an empty period without averages", async () => {
    const res = await recent({ country: "US" });

    expect(res.body.summary).toEqual({
      changes: 0,
      employees: 0,
      averageRaisePct: null,
      medianRaisePct: null,
    });
    expect(res.body.byReason).toEqual([]);
    expect(res.body.topRaises).toEqual([]);
  });

  it("rejects a period that ends before it starts", async () => {
    const res = await recent({ from: "2026-06-01", to: "2026-01-01" });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].message).toBe(
      "The start date must be on or before the end date",
    );
  });
});
