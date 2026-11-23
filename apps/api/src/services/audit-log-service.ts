import type { AuditLogQuery, AuditLogResponse } from "@salary/shared";
import type { PrismaClient } from "../db/client.js";
import { fromIsoDate } from "../domain/clock.js";
import type { Prisma } from "../generated/prisma/client.js";
import { toAuditEntryView } from "./employee-detail-service.js";

const DAY_MS = 86_400_000;

/**
 * Every search word must match the employee's first name, last name, code or email, so
 * "anna schmidt" finds Anna Schmidt and "e00042" finds E00042.
 */
function employeeSearch(search: string): Prisma.EmployeeWhereInput {
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  return {
    AND: search
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => ({
        OR: [
          { firstName: contains(word) },
          { lastName: contains(word) },
          { employeeCode: contains(word) },
          { email: contains(word) },
        ],
      })),
  };
}

/** The organisation-wide audit log, newest first. Dates are whole days in UTC, inclusive. */
export async function getAuditLog(
  prisma: PrismaClient,
  query: AuditLogQuery,
): Promise<AuditLogResponse> {
  const where: Prisma.AuditLogWhereInput = {
    ...(query.action && { action: query.action }),
    ...((query.from || query.to) && {
      createdAt: {
        ...(query.from && { gte: fromIsoDate(query.from) }),
        ...(query.to && { lt: new Date(fromIsoDate(query.to).getTime() + DAY_MS) }),
      },
    }),
    ...(query.search && { employee: employeeSearch(query.search) }),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: true,
        employee: { select: { employeeCode: true, firstName: true, lastName: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({ ...toAuditEntryView(row), employee: row.employee })),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}
