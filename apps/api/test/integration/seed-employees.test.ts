import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { generateEmployees } from "../../prisma/seed/generate-employees.js";
import { seedEmployees } from "../../prisma/seed/seed-employees.js";
import { seedReference } from "../../prisma/seed/seed-reference.js";
import { resetDatabase, testPrisma } from "./helpers/db.js";

const { employees } = generateEmployees({
  seed: 1,
  count: 200,
  referenceDate: new Date("2026-11-01"),
});
const expectedEntries = employees.reduce((sum, e) => sum + e.entries.length, 0);

beforeEach(async () => {
  await resetDatabase();
  await seedReference(testPrisma);
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("seedEmployees", () => {
  it("inserts every employee and every compensation entry", async () => {
    const result = await seedEmployees(testPrisma, employees);

    expect(result).toEqual({ employees: 200, compensationEntries: expectedEntries });
    expect(await testPrisma.employee.count()).toBe(200);
    expect(await testPrisma.compensationEntry.count()).toBe(expectedEntries);
  });

  it("stores current pay equal to each employee's latest compensation entry", async () => {
    await seedEmployees(testPrisma, employees);

    const mismatches = await testPrisma.$queryRaw<{ employeeCode: string }[]>`
      SELECT e."employeeCode"
      FROM "Employee" e
      JOIN LATERAL (
        SELECT "baseSalary", "targetBonus", "currency"
        FROM "CompensationEntry" c
        WHERE c."employeeId" = e.id
        ORDER BY c."effectiveDate" DESC
        LIMIT 1
      ) latest ON true
      WHERE latest."baseSalary" <> e."currentBaseSalary"
         OR latest."targetBonus" <> e."currentTargetBonus"
         OR latest."currency" <> e."currentCurrency"`;

    expect(mismatches).toEqual([]);
  });

  it("writes no audit entries (seeded data predates the system)", async () => {
    await seedEmployees(testPrisma, employees);

    expect(await testPrisma.auditLog.count()).toBe(0);
  });

  it("refuses to run when employees already exist", async () => {
    await seedEmployees(testPrisma, employees);

    await expect(seedEmployees(testPrisma, employees)).rejects.toThrow(/already has 200 employees/);
    expect(await testPrisma.employee.count()).toBe(200);
  });

  it("rolls back everything if any insert fails", async () => {
    const broken = employees.map((e, i) =>
      i === 150 ? { ...e, entries: [{ ...e.entries[0]!, baseSalary: 0 }] } : e,
    );

    await expect(seedEmployees(testPrisma, broken)).rejects.toThrow(
      /CompensationEntry_baseSalary_positive/,
    );
    expect(await testPrisma.employee.count()).toBe(0);
    expect(await testPrisma.compensationEntry.count()).toBe(0);
  });
});

describe("seedEmployees statistics", () => {
  it("refreshes planner statistics so queries right after a bulk load are fast", async () => {
    await seedEmployees(testPrisma, employees);

    // ANALYZE sets pg_class.reltuples to the real row count (it is unknown after TRUNCATE).
    const stats = await testPrisma.$queryRaw<{ relname: string; reltuples: number }[]>`
      SELECT relname, reltuples::int AS reltuples FROM pg_class
      WHERE relname IN ('Employee', 'CompensationEntry') ORDER BY relname`;
    expect(stats).toEqual([
      { relname: "CompensationEntry", reltuples: expectedEntries },
      { relname: "Employee", reltuples: 200 },
    ]);
  });
});
