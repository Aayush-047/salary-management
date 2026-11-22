import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { COUNTRIES, DEPARTMENTS, FX_RATES } from "../../prisma/seed/reference-data.js";
import { seedReference } from "../../prisma/seed/seed-reference.js";
import { resetDatabase, testPrisma } from "./helpers/db.js";

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("seedReference", () => {
  it("inserts exactly the reference data", async () => {
    const counts = await seedReference(testPrisma);

    expect(counts).toEqual({
      fxRates: FX_RATES.length,
      countries: COUNTRIES.length,
      departments: Object.keys(DEPARTMENTS).length,
      jobTitles: Object.values(DEPARTMENTS).flat().length,
      users: 1,
    });
  });

  it("is idempotent: a second run changes no rows or ids", async () => {
    await seedReference(testPrisma);
    const snapshot = async () => ({
      titles: await testPrisma.jobTitle.findMany({ orderBy: { id: "asc" } }),
      departments: await testPrisma.department.findMany({ orderBy: { id: "asc" } }),
      users: await testPrisma.user.findMany({ orderBy: { id: "asc" } }),
      countries: await testPrisma.country.findMany({ orderBy: { code: "asc" } }),
    });
    const before = await snapshot();

    await seedReference(testPrisma);

    expect(await snapshot()).toEqual(before);
  });

  it("links every job title to the department listed in the reference data", async () => {
    await seedReference(testPrisma);
    const titles = await testPrisma.jobTitle.findMany({ include: { department: true } });

    for (const title of titles) {
      expect(DEPARTMENTS[title.department.name]).toContain(title.name);
    }
  });

  it("gives every country's currency an FX rate", async () => {
    await seedReference(testPrisma);
    const countries = await testPrisma.country.findMany({ include: { fxRate: true } });

    expect(countries).toHaveLength(COUNTRIES.length);
    for (const country of countries) {
      expect(country.fxRate.rateToUsd).toBeGreaterThan(0);
    }
  });
});
