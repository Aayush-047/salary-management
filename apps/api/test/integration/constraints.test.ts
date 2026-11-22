import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedReference } from "../../prisma/seed/seed-reference.js";
import type { Prisma } from "../../src/generated/prisma/client.js";
import { resetDatabase, testPrisma } from "./helpers/db.js";

/** A valid employee in Germany; each test changes one field to break one rule. */
async function validEmployee(): Promise<Prisma.EmployeeUncheckedCreateInput> {
  const title = await testPrisma.jobTitle.findUniqueOrThrow({
    where: { name: "Software Engineer" },
  });
  return {
    employeeCode: "E00001",
    firstName: "Anna",
    lastName: "Schmidt",
    email: "anna.schmidt@example.com",
    countryCode: "DE",
    jobTitleId: title.id,
    level: 3,
    hireDate: new Date("2022-03-01"),
    status: "ACTIVE",
    terminationDate: null,
    currentBaseSalary: 70_000,
    currentTargetBonus: 7_000,
    currentCurrency: "EUR",
  };
}

beforeEach(async () => {
  await resetDatabase();
  await seedReference(testPrisma);
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("database constraints", () => {
  it("accepts the valid employee fixture", async () => {
    await expect(
      testPrisma.employee.create({ data: await validEmployee() }),
    ).resolves.toMatchObject({ employeeCode: "E00001" });
  });

  it.each<{ name: string; change: Partial<Prisma.EmployeeUncheckedCreateInput>; rule: string }>([
    { name: "level 0", change: { level: 0 }, rule: "Employee_level_range" },
    { name: "level 7", change: { level: 7 }, rule: "Employee_level_range" },
    {
      name: "zero base salary",
      change: { currentBaseSalary: 0 },
      rule: "Employee_currentBaseSalary_positive",
    },
    {
      name: "negative bonus",
      change: { currentTargetBonus: -1 },
      rule: "Employee_currentTargetBonus_non_negative",
    },
    {
      name: "terminated without a date",
      change: { status: "TERMINATED" },
      rule: "Employee_termination_matches_status",
    },
    {
      name: "active with a termination date",
      change: { terminationDate: new Date("2024-01-01") },
      rule: "Employee_termination_matches_status",
    },
    {
      name: "termination before hire",
      change: { status: "TERMINATED", terminationDate: new Date("2021-12-31") },
      rule: "Employee_termination_after_hire",
    },
  ])("rejects an employee with $name ($rule)", async ({ change, rule }) => {
    const data = { ...(await validEmployee()), ...change };

    await expect(testPrisma.employee.create({ data })).rejects.toThrow(rule);
  });

  it("rejects two compensation entries for the same employee on the same day", async () => {
    const employee = await testPrisma.employee.create({ data: await validEmployee() });
    const entry = {
      employeeId: employee.id,
      effectiveDate: new Date("2024-04-01"),
      baseSalary: 75_000,
      targetBonus: 7_500,
      currency: "EUR",
      reason: "MERIT" as const,
    };
    await testPrisma.compensationEntry.create({ data: entry });

    await expect(testPrisma.compensationEntry.create({ data: entry })).rejects.toThrow(
      /Unique constraint/i,
    );
  });

  it("rejects a country whose currency has no FX rate", async () => {
    await expect(
      testPrisma.country.create({ data: { code: "CH", name: "Switzerland", currency: "CHF" } }),
    ).rejects.toThrow(/Foreign key constraint/i);
  });
});
