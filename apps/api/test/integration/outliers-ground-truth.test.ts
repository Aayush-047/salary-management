import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateEmployees, type GenerationResult } from "../../prisma/seed/generate-employees.js";
import { seedEmployees } from "../../prisma/seed/seed-employees.js";
import { seedReference } from "../../prisma/seed/seed-reference.js";
import { createApp } from "../../src/app.js";
import { resetDatabase, testPrisma } from "./helpers/db.js";

/*
 * Checks the outlier detector against known answers: the seed deliberately pays ~2% of active
 * employees far from their peers and returns their codes. On the full 10,000-employee dataset
 * the detector should find nearly all of them and flag almost nobody else.
 *
 * Not 100%: a planted multiplier combined with the natural ±10% spread can land just inside
 * the band (e.g. 0.82), and by the HR rule that is then not an outlier.
 */
const app = createApp({ corsOrigin: "http://localhost:5173", prisma: testPrisma });
let generated: GenerationResult;

beforeAll(async () => {
  await resetDatabase();
  await seedReference(testPrisma);
  generated = generateEmployees({ seed: 42, count: 10_000, referenceDate: new Date("2026-11-01") });
  await seedEmployees(testPrisma, generated.employees);
}, 60_000);

afterAll(async () => {
  await testPrisma.$disconnect();
});

async function allFlaggedCodes(): Promise<Set<string>> {
  const codes = new Set<string>();
  for (let page = 1; ; page++) {
    const res = await request(app)
      .get("/insights/outliers")
      .query({ pageSize: "100", page: String(page) });
    for (const item of res.body.items) codes.add(item.employeeCode);
    if (page >= res.body.totalPages) return codes;
  }
}

describe("outlier detection against planted outliers (seed 42, 10,000 employees)", () => {
  it("finds at least 95% of planted outliers that are in judgeable peer groups", async () => {
    const active = generated.employees.filter((e) => e.status === "ACTIVE");
    const groupKey = (e: (typeof active)[number]) => `${e.countryCode}|${e.jobTitle}|${e.level}`;
    const groupSize = new Map<string, number>();
    for (const e of active) groupSize.set(groupKey(e), (groupSize.get(groupKey(e)) ?? 0) + 1);
    const byCode = new Map(active.map((e) => [e.employeeCode, e]));

    const planted = [...generated.plantedOutliers.underpaid, ...generated.plantedOutliers.overpaid];
    const judgeable = planted.filter((c) => (groupSize.get(groupKey(byCode.get(c)!)) ?? 0) >= 5);
    const flagged = await allFlaggedCodes();
    const found = judgeable.filter((c) => flagged.has(c));

    expect(judgeable.length).toBeGreaterThan(150);
    expect(found.length / judgeable.length).toBeGreaterThanOrEqual(0.95);
  });

  it("flags almost no one who was paid normally", async () => {
    const planted = new Set([
      ...generated.plantedOutliers.underpaid,
      ...generated.plantedOutliers.overpaid,
    ]);
    const flagged = await allFlaggedCodes();
    const natural = [...flagged].filter((c) => !planted.has(c));

    expect(natural.length).toBeLessThanOrEqual(flagged.size * 0.02);
  });
});
