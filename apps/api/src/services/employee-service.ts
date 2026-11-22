import type { EmployeeListItem, EmployeeListQuery, EmployeeListResponse } from "@salary/shared";
import type { PrismaClient } from "../db/client.js";
import { findEmployees, type EmployeeListRow } from "../repositories/employee-repository.js";

/** Formats a DATE column as YYYY-MM-DD. */
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toListItem(row: EmployeeListRow): EmployeeListItem {
  return {
    id: row.id,
    employeeCode: row.employeeCode,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    country: { code: row.countryCode, name: row.countryName },
    department: row.department,
    jobTitle: row.jobTitle,
    level: row.level,
    status: row.status,
    hireDate: isoDate(row.hireDate),
    terminationDate: row.terminationDate ? isoDate(row.terminationDate) : null,
    baseSalary: row.baseSalary,
    targetBonus: row.targetBonus,
    totalCash: row.baseSalary + row.targetBonus,
    currency: row.currency,
  };
}

export async function listEmployees(
  prisma: PrismaClient,
  query: EmployeeListQuery,
): Promise<EmployeeListResponse> {
  const { rows, total } = await findEmployees(prisma, query);
  return {
    items: rows.map(toListItem),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}
