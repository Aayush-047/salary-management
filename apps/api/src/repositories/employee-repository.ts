import type { EmployeeListQuery, EmployeeSortField, EmployeeStatus } from "@salary/shared";
import type { PrismaClient } from "../db/client.js";
import { Prisma } from "../generated/prisma/client.js";

export type EmployeeListRow = {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  countryName: string;
  department: string;
  jobTitle: string;
  level: number;
  status: EmployeeStatus;
  hireDate: Date;
  terminationDate: Date | null;
  baseSalary: number;
  targetBonus: number;
  currency: string;
};

/** Escapes LIKE/ILIKE wildcards so user text matches literally. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * ORDER BY clauses from a fixed allow-list (never from user text).
 * Pay sorts use the USD-equivalent so amounts in different currencies rank correctly.
 * `e.id` breaks ties so paging is stable.
 */
function orderBy(sortBy: EmployeeSortField, sortDir: "asc" | "desc"): Prisma.Sql {
  const dir = Prisma.raw(sortDir === "desc" ? "DESC" : "ASC");
  const sorts: Record<EmployeeSortField, Prisma.Sql> = {
    name: Prisma.sql`e."lastName" ${dir}, e."firstName" ${dir}`,
    employeeCode: Prisma.sql`e."employeeCode" ${dir}`,
    hireDate: Prisma.sql`e."hireDate" ${dir}`,
    level: Prisma.sql`e.level ${dir}`,
    baseSalary: Prisma.sql`e."currentBaseSalary" * f."rateToUsd" ${dir}`,
    totalCash: Prisma.sql`(e."currentBaseSalary" + e."currentTargetBonus") * f."rateToUsd" ${dir}`,
  };
  return Prisma.sql`${sorts[sortBy]}, e.id ASC`;
}

/** WHERE clause for the shared employee filters (plus search on the list). Used by insights too. */
export function whereClause(
  query: Pick<EmployeeListQuery, "status" | "country" | "department" | "jobTitle" | "level"> & {
    search?: string | undefined;
  },
): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];
  if (query.status !== "ALL") {
    conditions.push(Prisma.sql`e.status = ${query.status}::"EmployeeStatus"`);
  }
  if (query.country)
    conditions.push(Prisma.sql`e."countryCode" IN (${Prisma.join(query.country)})`);
  if (query.department) conditions.push(Prisma.sql`d.name IN (${Prisma.join(query.department)})`);
  if (query.jobTitle) conditions.push(Prisma.sql`j.name IN (${Prisma.join(query.jobTitle)})`);
  if (query.level) conditions.push(Prisma.sql`e.level IN (${Prisma.join(query.level)})`);
  if (query.search) {
    const pattern = `%${escapeLike(query.search)}%`;
    conditions.push(Prisma.sql`(
      (e."firstName" || ' ' || e."lastName") ILIKE ${pattern}
      OR e.email ILIKE ${pattern}
      OR e."employeeCode" ILIKE ${pattern}
    )`);
  }
  return conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
}

/** Employees joined with country, FX rate, job title and department (aliases e, c, f, j, d). */
export const FROM = Prisma.sql`
  FROM "Employee" e
  JOIN "Country" c ON c.code = e."countryCode"
  JOIN "FxRate" f ON f.currency = e."currentCurrency"
  JOIN "JobTitle" j ON j.id = e."jobTitleId"
  JOIN "Department" d ON d.id = j."departmentId"`;

export async function findEmployees(
  prisma: PrismaClient,
  query: EmployeeListQuery,
): Promise<{ rows: EmployeeListRow[]; total: number }> {
  const where = whereClause(query);
  const offset = (query.page - 1) * query.pageSize;

  const [rows, counts] = await Promise.all([
    prisma.$queryRaw<EmployeeListRow[]>`
      SELECT e.id, e."employeeCode", e."firstName", e."lastName", e.email,
             e."countryCode", c.name AS "countryName", d.name AS department, j.name AS "jobTitle",
             e.level::int AS level, e.status::text AS status, e."hireDate", e."terminationDate",
             e."currentBaseSalary" AS "baseSalary", e."currentTargetBonus" AS "targetBonus",
             e."currentCurrency" AS currency
      ${FROM}
      ${where}
      ORDER BY ${orderBy(query.sortBy, query.sortDir)}
      LIMIT ${query.pageSize} OFFSET ${offset}`,
    prisma.$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) AS total ${FROM} ${where}`,
  ]);

  return { rows, total: Number(counts[0]?.total ?? 0) };
}
