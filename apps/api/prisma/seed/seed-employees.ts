import type { PrismaClient } from "../../src/db/client.js";
import type { GeneratedEmployee } from "./generate-employees.js";

const EMPLOYEE_BATCH_SIZE = 1_000;
const ENTRY_BATCH_SIZE = 5_000;
/** Inserting ~30k rows takes a few seconds; Prisma's default interactive transaction timeout is 5s. */
const TRANSACTION_TIMEOUT_MS = 120_000;

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

/**
 * Inserts generated employees and their compensation history in one transaction.
 * Refuses to run when employees already exist, so it never mixes two datasets.
 * No audit entries are written: seeded data represents records migrated before go-live.
 */
export async function seedEmployees(
  prisma: PrismaClient,
  employees: readonly GeneratedEmployee[],
): Promise<{ employees: number; compensationEntries: number }> {
  const existing = await prisma.employee.count();
  if (existing > 0) {
    throw new Error(
      `Database already has ${existing} employees. Run "npm run db:reset" to start from a fresh database.`,
    );
  }

  const titles = await prisma.jobTitle.findMany({ select: { id: true, name: true } });
  const titleIds = new Map(titles.map((t) => [t.name, t.id]));
  const titleIdFor = (name: string): number => {
    const id = titleIds.get(name);
    if (id === undefined)
      throw new Error(`Job title "${name}" not found: seed reference data first`);
    return id;
  };

  const result = await prisma.$transaction(
    async (tx) => {
      for (const batch of chunks(employees, EMPLOYEE_BATCH_SIZE)) {
        await tx.employee.createMany({
          data: batch.map((e) => ({
            employeeCode: e.employeeCode,
            firstName: e.firstName,
            lastName: e.lastName,
            email: e.email,
            countryCode: e.countryCode,
            jobTitleId: titleIdFor(e.jobTitle),
            level: e.level,
            hireDate: e.hireDate,
            status: e.status,
            terminationDate: e.terminationDate,
            currentBaseSalary: e.currentBaseSalary,
            currentTargetBonus: e.currentTargetBonus,
            currentCurrency: e.currentCurrency,
          })),
        });
      }

      const inserted = await tx.employee.findMany({ select: { id: true, employeeCode: true } });
      const idByCode = new Map(inserted.map((e) => [e.employeeCode, e.id]));

      const entries = employees.flatMap((e) => {
        const employeeId = idByCode.get(e.employeeCode)!;
        return e.entries.map((entry) => ({ employeeId, ...entry }));
      });
      for (const batch of chunks(entries, ENTRY_BATCH_SIZE)) {
        await tx.compensationEntry.createMany({ data: batch });
      }

      return { employees: inserted.length, compensationEntries: entries.length };
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );

  // Refresh planner statistics: right after a bulk load Postgres still thinks the tables are
  // nearly empty and can pick very slow plans (the outlier query took 14 s instead of 40 ms).
  await prisma.$executeRawUnsafe(`ANALYZE "Employee", "CompensationEntry"`);
  return result;
}
