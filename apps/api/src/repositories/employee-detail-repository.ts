import type { Db } from "../services/audit.js";

/** An employee with everything the detail page needs; pay entries oldest first. */
export function findEmployeeByCode(db: Db, employeeCode: string) {
  return db.employee.findUnique({
    where: { employeeCode },
    include: {
      country: true,
      jobTitle: { include: { department: true } },
      compensationEntries: { orderBy: { effectiveDate: "asc" } },
    },
  });
}

export type EmployeeWithDetails = NonNullable<Awaited<ReturnType<typeof findEmployeeByCode>>>;

/** An employee's audit history, newest first (id breaks ties within the same instant). */
export function findAuditForEmployee(db: Db, employeeId: number) {
  return db.auditLog.findMany({
    where: { employeeId },
    include: { actor: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}
