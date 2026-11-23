import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedReference } from "../../prisma/seed/seed-reference.js";
import { createApp } from "../../src/app.js";
import { resetDatabase, testPrisma } from "./helpers/db.js";
import { createEmployees, type TestEmployee } from "./helpers/fixtures.js";

/*
 * A small team with hand-checkable numbers. Rates: EUR 1.16, JPY 0.0066, GBP 1.33 (to USD).
 * Base in USD: Anna 81,200 · Ben 58,000 · Clara 69,600 · Carla 100,000 · Mia 230,000 ·
 * Daisuke 66,000. George has left and is excluded by default.
 */
const TEAM: TestEmployee[] = [
  {
    employeeCode: "E00001",
    firstName: "Anna",
    lastName: "Schmidt",
    countryCode: "DE",
    jobTitle: "Software Engineer",
    level: 3,
    baseSalary: 70_000,
    targetBonus: 7_000,
  },
  {
    employeeCode: "E00002",
    firstName: "Ben",
    lastName: "Weber",
    countryCode: "DE",
    jobTitle: "QA Engineer",
    level: 2,
    baseSalary: 50_000,
    targetBonus: 3_500,
  },
  {
    employeeCode: "E00003",
    firstName: "Clara",
    lastName: "Koch",
    countryCode: "DE",
    jobTitle: "Data Analyst",
    level: 3,
    baseSalary: 60_000,
    targetBonus: 6_000,
  },
  {
    employeeCode: "E00004",
    firstName: "Carla",
    lastName: "Diaz",
    countryCode: "US",
    jobTitle: "Software Engineer",
    level: 3,
    baseSalary: 100_000,
    targetBonus: 10_000,
  },
  {
    employeeCode: "E00005",
    firstName: "Mia",
    lastName: "Schmidt",
    countryCode: "US",
    jobTitle: "Product Manager",
    level: 5,
    baseSalary: 230_000,
    targetBonus: 34_500,
  },
  {
    employeeCode: "E00006",
    firstName: "Daisuke",
    lastName: "Sato",
    countryCode: "JP",
    jobTitle: "Software Engineer",
    level: 3,
    baseSalary: 10_000_000,
    targetBonus: 1_000_000,
  },
  {
    employeeCode: "E00007",
    firstName: "George",
    lastName: "Hall",
    countryCode: "GB",
    jobTitle: "Recruiter",
    level: 2,
    baseSalary: 40_000,
    targetBonus: 2_800,
    terminationDate: "2025-06-30",
  },
];

const app = createApp({ corsOrigin: "http://localhost:5173", prisma: testPrisma });
const stats = (query: Record<string, string | string[]>) =>
  request(app).get("/insights/pay-stats").query(query);
const summary = (row: Record<string, unknown>) => [
  row.label,
  row.headcount,
  row.min,
  row.median,
  row.average,
  row.max,
  row.total,
  row.currency,
];

beforeAll(async () => {
  await resetDatabase();
  await seedReference(testPrisma);
  await createEmployees(testPrisma, TEAM);
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("GET /insights/pay-stats", () => {
  it("by country in LOCAL keeps each country's own currency, exactly", async () => {
    const res = await stats({ groupBy: "country", metric: "base" });

    expect(res.status).toBe(200);
    expect(res.body.rows.map(summary)).toEqual([
      ["Germany", 3, 50_000, 60_000, 60_000, 70_000, 180_000, "EUR"],
      ["Japan", 1, 10_000_000, 10_000_000, 10_000_000, 10_000_000, 10_000_000, "JPY"],
      ["United States", 2, 100_000, 165_000, 165_000, 230_000, 330_000, "USD"],
    ]);
  });

  it("gives a whole-organisation row in USD when LOCAL is selected", async () => {
    const res = await stats({ metric: "base" });

    // Sorted USD values: 58,000 · 66,000 · 69,600 · 81,200 · 100,000 · 230,000.
    expect(summary(res.body.overall)).toEqual([
      "All employees",
      6,
      58_000,
      75_400, // (69,600 + 81,200) / 2
      100_800,
      230_000,
      604_800,
      "USD",
    ]);
    expect(res.body.fxAsOf).toBe("2026-11-01");
  });

  it("converts everything into a chosen currency", async () => {
    const res = await stats({ groupBy: "country", metric: "base", currency: "EUR" });

    expect(
      res.body.rows.map((r: Record<string, unknown>) => [r.label, r.median, r.currency]),
    ).toEqual([
      ["Germany", 60_000, "EUR"],
      ["Japan", 56_897, "EUR"], // 10,000,000 × 0.0066 ÷ 1.16
      ["United States", 142_241, "EUR"], // median 165,000 USD ÷ 1.16
    ]);
  });

  it("uses USD for groups that mix countries when LOCAL is selected", async () => {
    const res = await stats({ groupBy: "department", metric: "base" });

    expect(res.body.rows.map(summary)).toEqual([
      ["Data", 1, 69_600, 69_600, 69_600, 69_600, 69_600, "USD"],
      ["Engineering", 4, 58_000, 73_600, 76_300, 100_000, 305_200, "USD"],
      ["Product", 1, 230_000, 230_000, 230_000, 230_000, 230_000, "USD"],
    ]);
  });

  it("orders levels numerically", async () => {
    const res = await stats({ groupBy: "level", metric: "base" });

    expect(
      res.body.rows.map((r: Record<string, unknown>) => [r.label, r.headcount, r.median]),
    ).toEqual([
      ["L2", 1, 58_000],
      ["L3", 4, 75_400],
      ["L5", 1, 230_000],
    ]);
  });

  it("uses base + target bonus for total cash", async () => {
    const res = await stats({ groupBy: "country", metric: "total", country: "DE" });

    expect(res.body.rows.map(summary)).toEqual([
      ["Germany", 3, 53_500, 66_000, 65_500, 77_000, 196_500, "EUR"],
    ]);
  });

  it("applies the same filters as the employee list, including leavers on request", async () => {
    const active = await stats({ country: "GB" });
    const all = await stats({ country: "GB", status: "ALL", metric: "base" });

    expect(active.body).toMatchObject({ rows: [], overall: null });
    expect(all.body.rows.map(summary)).toEqual([
      ["United Kingdom", 1, 40_000, 40_000, 40_000, 40_000, 40_000, "GBP"],
    ]);
  });

  it("rejects a currency without an exchange rate", async () => {
    const res = await stats({ currency: "CHF" });

    expect(res.status).toBe(422);
    expect(res.body.error).toEqual({
      code: "UNKNOWN_CURRENCY",
      message: "No exchange rate for CHF",
    });
  });
});
