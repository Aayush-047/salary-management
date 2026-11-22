import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedReference } from "../../prisma/seed/seed-reference.js";
import { getCurrentUser, recordAudit, syncCurrentCompensation } from "../../src/services/audit.js";
import { resetDatabase, testPrisma } from "./helpers/db.js";
import { createEmployees } from "./helpers/fixtures.js";

beforeEach(async () => {
  await resetDatabase();
  await seedReference(testPrisma);
  await createEmployees(testPrisma, [
    {
      employeeCode: "E00001",
      firstName: "Anna",
      lastName: "Schmidt",
      countryCode: "DE",
      jobTitle: "Software Engineer",
      level: 3,
      baseSalary: 70_000,
      targetBonus: 7_000,
      hireDate: "2022-03-01",
    },
  ]);
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

const anna = () => testPrisma.employee.findUniqueOrThrow({ where: { employeeCode: "E00001" } });

const entry = (employeeId: number, effectiveDate: string, baseSalary: number) => ({
  employeeId,
  effectiveDate: new Date(effectiveDate),
  baseSalary,
  targetBonus: baseSalary / 10,
  currency: "EUR",
  reason: "MERIT" as const,
});

describe("getCurrentUser", () => {
  it("returns the seeded HR Manager", async () => {
    expect(await getCurrentUser(testPrisma)).toEqual({
      id: expect.any(Number),
      name: "HR Manager",
    });
  });
});

describe("syncCurrentCompensation", () => {
  it("copies the latest entry by effective date, not the most recently inserted", async () => {
    const { id } = await anna();
    await testPrisma.compensationEntry.createMany({
      data: [entry(id, "2022-03-01", 70_000), entry(id, "2024-04-01", 80_000)],
    });
    // Inserted last, but dated earlier: must not become current pay.
    await testPrisma.compensationEntry.create({ data: entry(id, "2023-04-01", 75_000) });

    await testPrisma.$transaction((tx) => syncCurrentCompensation(tx, id));

    expect(await anna()).toMatchObject({ currentBaseSalary: 80_000, currentTargetBonus: 8_000 });
  });

  it("fails loudly for an employee without pay entries", async () => {
    const { id } = await anna();

    await expect(testPrisma.$transaction((tx) => syncCurrentCompensation(tx, id))).rejects.toThrow(
      /no compensation entries/,
    );
  });
});

describe("recordAudit", () => {
  it("stores the actor, the field changes and the reason", async () => {
    const { id } = await anna();
    const actor = await getCurrentUser(testPrisma);

    await testPrisma.$transaction((tx) =>
      recordAudit(tx, {
        actorId: actor.id,
        employeeId: id,
        entityType: "EMPLOYEE",
        entityId: id,
        action: "UPDATE",
        changes: [{ field: "level", from: 3, to: 4 }],
        reason: "Level was entered wrongly",
      }),
    );

    expect(await testPrisma.auditLog.findMany({ include: { actor: true } })).toEqual([
      expect.objectContaining({
        employeeId: id,
        action: "UPDATE",
        changes: [{ field: "level", from: 3, to: 4 }],
        reason: "Level was entered wrongly",
        actor: expect.objectContaining({ name: "HR Manager" }),
      }),
    ]);
  });
});
