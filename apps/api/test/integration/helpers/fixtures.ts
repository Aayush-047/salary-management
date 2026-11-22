import type { PrismaClient } from "../../../src/db/client.js";
import { COUNTRIES } from "../../../prisma/seed/reference-data.js";

export type TestEmployee = {
  employeeCode: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  jobTitle: string;
  level: number;
  baseSalary: number;
  targetBonus: number;
  hireDate?: string;
  terminationDate?: string;
};

/** Inserts employees with exactly the given values (reference data must already be seeded). */
export async function createEmployees(
  prisma: PrismaClient,
  employees: readonly TestEmployee[],
): Promise<void> {
  const titles = await prisma.jobTitle.findMany();
  const titleId = new Map(titles.map((t) => [t.name, t.id]));
  const currency = new Map(COUNTRIES.map((c) => [c.code, c.currency]));

  await prisma.employee.createMany({
    data: employees.map((e) => ({
      employeeCode: e.employeeCode,
      firstName: e.firstName,
      lastName: e.lastName,
      email: `${e.firstName}.${e.lastName}@example.com`.toLowerCase(),
      countryCode: e.countryCode,
      jobTitleId: titleId.get(e.jobTitle)!,
      level: e.level,
      hireDate: new Date(e.hireDate ?? "2022-01-10"),
      status: e.terminationDate ? "TERMINATED" : "ACTIVE",
      terminationDate: e.terminationDate ? new Date(e.terminationDate) : null,
      currentBaseSalary: e.baseSalary,
      currentTargetBonus: e.targetBonus,
      currentCurrency: currency.get(e.countryCode)!,
    })),
  });
}
