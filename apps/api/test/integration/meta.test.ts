import { LEVELS, OUTLIER_DEFAULTS } from "@salary/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { COUNTRIES, DEPARTMENTS, FX_RATES } from "../../prisma/seed/reference-data.js";
import { seedReference } from "../../prisma/seed/seed-reference.js";
import { createApp } from "../../src/app.js";
import { resetDatabase, testPrisma } from "./helpers/db.js";

const app = createApp({ corsOrigin: "http://localhost:5173", prisma: testPrisma });

beforeAll(async () => {
  await resetDatabase();
  await seedReference(testPrisma);
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("GET /meta", () => {
  it("returns countries sorted by name with their currencies", async () => {
    const res = await request(app).get("/meta");

    expect(res.status).toBe(200);
    expect(res.body.countries).toEqual([...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)));
  });

  it("returns every department with its job titles, both sorted", async () => {
    const res = await request(app).get("/meta");

    const expected = Object.entries(DEPARTMENTS)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, titles]) => ({ name, jobTitles: [...titles].sort() }));
    expect(res.body.departments).toEqual(expected);
  });

  it("returns levels, FX rates with their as-of date, and outlier defaults", async () => {
    const res = await request(app).get("/meta");

    expect(res.body.levels).toEqual([...LEVELS]);
    expect(res.body.fx).toEqual({
      asOf: "2026-11-01",
      ratesToUsd: Object.fromEntries(FX_RATES.map((r) => [r.currency, r.rateToUsd])),
    });
    expect(res.body.outlierDefaults).toEqual(OUTLIER_DEFAULTS);
  });

  it("lets browsers cache the response for five minutes", async () => {
    const res = await request(app).get("/meta");

    expect(res.headers["cache-control"]).toBe("public, max-age=300");
  });
});
