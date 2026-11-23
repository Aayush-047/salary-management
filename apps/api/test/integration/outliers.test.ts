import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedReference } from "../../prisma/seed/seed-reference.js";
import { createApp } from "../../src/app.js";
import { resetDatabase, testPrisma } from "./helpers/db.js";
import { createEmployees, type TestEmployee } from "./helpers/fixtures.js";

/*
 * Three peer groups (peers share job title, level and country):
 * - DE Software Engineer L3, 6 people: 55k 68k 70k 72k 75k 95k → median 71k.
 *   55k → 0.77 (under), 95k → 1.34 (over); a leaver on 20k is excluded and doesn't skew it.
 * - US Software Engineer L3, 5 people: 100k ×4, 150k → median 100k; 150k → 1.50 (over).
 * - DE Data Analyst L3, 2 people: 40k, 80k → too small to judge at the default minimum of 5.
 */
let code = 0;
const person = (
  countryCode: string,
  jobTitle: string,
  baseSalary: number,
  extra: Partial<TestEmployee> = {},
): TestEmployee => {
  code += 1;
  return {
    employeeCode: `E${String(code).padStart(5, "0")}`,
    firstName: `P${code}`,
    lastName: `${countryCode}${baseSalary}`,
    countryCode,
    jobTitle,
    level: 3,
    baseSalary,
    targetBonus: baseSalary / 10,
    ...extra,
  };
};
const TEAM = [
  ...[55_000, 68_000, 70_000, 72_000, 75_000, 95_000].map((pay) =>
    person("DE", "Software Engineer", pay),
  ),
  person("DE", "Software Engineer", 20_000, { terminationDate: "2025-06-30" }),
  ...[100_000, 100_000, 100_000, 100_000, 150_000].map((pay) =>
    person("US", "Software Engineer", pay),
  ),
  person("DE", "Data Analyst", 40_000),
  person("DE", "Data Analyst", 80_000),
];

const app = createApp({ corsOrigin: "http://localhost:5173", prisma: testPrisma });
const outliers = (query: Record<string, string> = {}) =>
  request(app).get("/insights/outliers").query(query);
const flagged = (body: { items: { lastName: string; compaRatio: number; direction: string }[] }) =>
  body.items.map((i) => [i.lastName, i.compaRatio, i.direction]);

beforeAll(async () => {
  await resetDatabase();
  await seedReference(testPrisma);
  await createEmployees(testPrisma, TEAM);
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("GET /insights/outliers", () => {
  it("flags pay outside 0.80–1.20 of the peer median, furthest from 1.00 first", async () => {
    const res = await outliers();

    expect(res.status).toBe(200);
    expect(flagged(res.body)).toEqual([
      ["US150000", 1.5, "over"],
      ["DE95000", 1.34, "over"],
      ["DE55000", 0.77, "under"],
    ]);
    expect(res.body.items[2]).toMatchObject({
      pay: 55_000,
      peerMedian: 71_000,
      currency: "EUR",
      peerCount: 6,
      jobTitle: "Software Engineer",
      level: 3,
    });
  });

  it("reports how much of the population could be judged", async () => {
    const res = await outliers();

    expect(res.body.summary).toEqual({
      peerGroups: 2,
      employeesAnalysed: 11,
      smallPeerGroups: 1,
      employeesNotAnalysed: 2,
      underpaid: 1,
      overpaid: 2,
    });
  });

  it("judges small groups only when the minimum is lowered", async () => {
    const res = await outliers({ minPeers: "2" });

    expect(flagged(res.body)).toEqual(
      expect.arrayContaining([
        ["DE40000", 0.67, "under"], // 40k ÷ 60k
        ["DE80000", 1.33, "over"],
      ]),
    );
    expect(res.body.summary.smallPeerGroups).toBe(0);
  });

  it("follows a custom band and direction", async () => {
    const wider = await outliers({ low: "0.75", high: "1.4" });
    const under = await outliers({ direction: "under" });

    expect(flagged(wider.body)).toEqual([["US150000", 1.5, "over"]]);
    expect(flagged(under.body)).toEqual([["DE55000", 0.77, "under"]]);
  });

  it("applies the employee filters", async () => {
    const res = await outliers({ country: "US" });

    expect(flagged(res.body)).toEqual([["US150000", 1.5, "over"]]);
    expect(res.body.summary).toMatchObject({ peerGroups: 1, employeesAnalysed: 5 });
  });

  it("pages through results", async () => {
    const res = await outliers({ pageSize: "2", page: "2" });

    expect(res.body).toMatchObject({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
    expect(flagged(res.body)).toEqual([["DE55000", 0.77, "under"]]);
  });

  it("rejects an invalid band", async () => {
    const res = await outliers({ low: "1.1" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
