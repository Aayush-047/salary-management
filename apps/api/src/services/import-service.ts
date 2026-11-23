import type { ImportCheckResponse, ImportIssue, ImportResponse } from "@salary/shared";
import type { PrismaClient } from "../db/client.js";
import { diffFields } from "../domain/audit-diff.js";
import { fromIsoDate, latestAllowedDate, type Clock } from "../domain/clock.js";
import {
  readEmployeeCsv,
  validateEmployeeRows,
  type ImportReference,
  type ValidRow,
} from "../domain/employee-import.js";
import { DomainError } from "../domain/errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { getCurrentUser } from "./audit.js";
import {
  PROFILE_FIELDS,
  formatEmployeeCode,
  nextEmployeeNumber,
} from "./employee-write-service.js";

/** The check lists this many problems; the total is reported separately. */
const MAX_LISTED_ISSUES = 200;
/** Creating 10,000 employees with history and audit takes a few seconds. */
const IMPORT_TIMEOUT_MS = 120_000;

type Checked = {
  response: ImportCheckResponse;
  valid: ValidRow[];
  reference: ImportReference;
};

async function loadReference(
  prisma: PrismaClient,
  clock: Clock,
  emails: string[],
): Promise<ImportReference> {
  const [countries, titles, existing] = await Promise.all([
    prisma.country.findMany(),
    prisma.jobTitle.findMany({ select: { name: true } }),
    prisma.employee.findMany({
      where: { email: { in: emails } },
      select: { email: true, employeeCode: true },
    }),
  ]);
  return {
    countries: new Map(countries.map((c) => [c.code, c.currency])),
    jobTitles: new Set(titles.map((t) => t.name)),
    existingEmails: new Map(existing.map((e) => [e.email, e.employeeCode])),
    latestAllowedDate: latestAllowedDate(clock),
  };
}

/** Problems for the whole file first, then by row. */
function byRow(a: ImportIssue, b: ImportIssue): number {
  return (a.row ?? 0) - (b.row ?? 0);
}

/** Reads and validates a file without saving anything. */
async function check(
  prisma: PrismaClient,
  clock: Clock,
  text: string,
  filename: string,
): Promise<Checked> {
  const read = readEmployeeCsv(text);
  const emails = read.rows.map((r) => r.values.email.trim().toLowerCase()).filter(Boolean);
  const reference = await loadReference(prisma, clock, emails);
  const checked = validateEmployeeRows(read.rows, reference);
  const issues = [...read.issues, ...checked.issues].sort(byRow);

  const countryNames = new Map(
    (await prisma.country.findMany()).map((c) => [c.code, c.name] as const),
  );
  const perCountry = new Map<string, number>();
  for (const { input } of checked.valid) {
    perCountry.set(input.countryCode, (perCountry.get(input.countryCode) ?? 0) + 1);
  }

  return {
    valid: checked.valid,
    reference,
    response: {
      filename,
      rows: read.dataRows,
      valid: issues.length === 0 && checked.valid.length > 0,
      errorCount: issues.length,
      errors: issues.slice(0, MAX_LISTED_ISSUES),
      byCountry: [...perCountry]
        .map(([code, count]) => ({ code, name: countryNames.get(code) ?? code, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    },
  };
}

export async function checkImport(
  prisma: PrismaClient,
  clock: Clock,
  text: string,
  filename: string,
): Promise<ImportCheckResponse> {
  return (await check(prisma, clock, text, filename)).response;
}

/**
 * Imports every row or none. The file is validated again here: an earlier check may be stale
 * (the file or the data may have changed since). Each employee gets a HIRE pay entry and a
 * CREATE audit entry naming the file, exactly like one added in the app.
 */
export async function importEmployees(
  prisma: PrismaClient,
  clock: Clock,
  text: string,
  filename: string,
): Promise<ImportResponse> {
  const { response, valid, reference } = await check(prisma, clock, text, filename);
  if (!response.valid) {
    const problems = response.errorCount === 1 ? "1 problem" : `${response.errorCount} problems`;
    throw new DomainError(
      422,
      "IMPORT_INVALID",
      `The file has ${problems}; nothing was imported`,
      response,
    );
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const actor = await getCurrentUser(tx);
      const first = await nextEmployeeNumber(tx);
      const titleIds = new Map((await tx.jobTitle.findMany()).map((t) => [t.name, t.id] as const));
      const people = valid.map(({ input }, index) => ({
        input,
        code: formatEmployeeCode(first + index),
        currency: reference.countries.get(input.countryCode)!,
        hireDate: fromIsoDate(input.hireDate),
      }));

      await tx.employee.createMany({
        data: people.map(({ input, code, currency, hireDate }) => ({
          employeeCode: code,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          countryCode: input.countryCode,
          jobTitleId: titleIds.get(input.jobTitle)!,
          level: input.level,
          hireDate,
          currentBaseSalary: input.baseSalary,
          currentTargetBonus: input.targetBonus,
          currentCurrency: currency,
        })),
      });
      const created = await tx.employee.findMany({
        where: { employeeCode: { in: people.map((p) => p.code) } },
        select: { id: true, employeeCode: true },
      });
      const idOf = new Map(created.map((e) => [e.employeeCode, e.id]));

      await tx.compensationEntry.createMany({
        data: people.map(({ input, code, currency, hireDate }) => ({
          employeeId: idOf.get(code)!,
          effectiveDate: hireDate,
          baseSalary: input.baseSalary,
          targetBonus: input.targetBonus,
          currency,
          reason: "HIRE" as const,
        })),
      });
      await tx.auditLog.createMany({
        data: people.map(({ input, code, currency, hireDate }) => ({
          actorId: actor.id,
          employeeId: idOf.get(code)!,
          entityType: "EMPLOYEE" as const,
          entityId: idOf.get(code)!,
          action: "CREATE" as const,
          changes: diffFields(
            {},
            {
              firstName: input.firstName,
              lastName: input.lastName,
              email: input.email,
              country: input.countryCode,
              jobTitle: input.jobTitle,
              level: input.level,
              hireDate,
              baseSalary: input.baseSalary,
              targetBonus: input.targetBonus,
              currency,
            },
            PROFILE_FIELDS,
          ) as Prisma.InputJsonValue,
          reason: `Imported from ${filename}`,
        })),
      });

      return {
        imported: people.length,
        firstCode: people[0]!.code,
        lastCode: people.at(-1)!.code,
      };
    },
    { timeout: IMPORT_TIMEOUT_MS },
  );

  // Fresh statistics after a bulk insert, or queries can pick very slow plans (see DESIGN.md).
  await prisma.$executeRawUnsafe(`ANALYZE "Employee", "CompensationEntry", "AuditLog"`);
  return result;
}
