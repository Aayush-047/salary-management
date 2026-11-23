import type {
  AuditEntryView,
  AuditFieldChange,
  AuditListResponse,
  CompensationEntryView,
  EmployeeDetail,
  EmployeeListItem,
} from "@salary/shared";
import { toIsoDate } from "../domain/clock.js";
import { notFound } from "../domain/errors.js";
import {
  findAuditForEmployee,
  findEmployeeByCode,
  type EmployeeWithDetails,
} from "../repositories/employee-detail-repository.js";
import type { Db } from "./audit.js";

/** Codes are stored upper-case (E00042); accept any case in URLs. */
export function normaliseEmployeeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Loads an employee by code or throws a 404. */
export async function requireEmployee(db: Db, code: string): Promise<EmployeeWithDetails> {
  const employeeCode = normaliseEmployeeCode(code);
  const employee = await findEmployeeByCode(db, employeeCode);
  if (!employee) {
    throw notFound("EMPLOYEE_NOT_FOUND", `Employee ${employeeCode} not found`);
  }
  return employee;
}

export function toEmployeeSummary(e: EmployeeWithDetails): EmployeeListItem {
  return {
    id: e.id,
    employeeCode: e.employeeCode,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    country: { code: e.country.code, name: e.country.name },
    department: e.jobTitle.department.name,
    jobTitle: e.jobTitle.name,
    level: e.level,
    status: e.status,
    hireDate: toIsoDate(e.hireDate),
    terminationDate: e.terminationDate ? toIsoDate(e.terminationDate) : null,
    baseSalary: e.currentBaseSalary,
    targetBonus: e.currentTargetBonus,
    totalCash: e.currentBaseSalary + e.currentTargetBonus,
    currency: e.currentCurrency,
  };
}

/**
 * Pay timeline, newest first. Each entry's change is relative to the entry before it; it is
 * null for the first entry and when the currency changed, since a % across currencies is
 * meaningless.
 */
export function toTimeline(
  entries: EmployeeWithDetails["compensationEntries"],
): CompensationEntryView[] {
  return entries
    .map((entry, i): CompensationEntryView => {
      const previous = entries[i - 1];
      const comparable = previous !== undefined && previous.currency === entry.currency;
      return {
        id: entry.id,
        effectiveDate: toIsoDate(entry.effectiveDate),
        baseSalary: entry.baseSalary,
        targetBonus: entry.targetBonus,
        totalCash: entry.baseSalary + entry.targetBonus,
        currency: entry.currency,
        reason: entry.reason,
        note: entry.note,
        baseChangePct: comparable
          ? Math.round(((entry.baseSalary - previous.baseSalary) / previous.baseSalary) * 10_000) /
            10_000
          : null,
      };
    })
    .reverse();
}

export async function getEmployeeDetail(db: Db, code: string): Promise<EmployeeDetail> {
  const employee = await requireEmployee(db, code);
  return { ...toEmployeeSummary(employee), compensation: toTimeline(employee.compensationEntries) };
}

export async function getEmployeeAudit(db: Db, code: string): Promise<AuditListResponse> {
  const employee = await requireEmployee(db, code);
  const rows = await findAuditForEmployee(db, employee.id);
  return {
    items: rows.map(toAuditEntryView),
  };
}

type AuditRowWithActor = {
  id: number;
  createdAt: Date;
  actor: { id: number; name: string };
  action: AuditEntryView["action"];
  entityType: AuditEntryView["entityType"];
  entityId: number;
  changes: unknown;
  reason: string | null;
};

/** One audit row as the API shows it (per employee and organisation-wide alike). */
export function toAuditEntryView(row: AuditRowWithActor): AuditEntryView {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    actor: { id: row.actor.id, name: row.actor.name },
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    changes: row.changes as AuditFieldChange[],
    reason: row.reason,
  };
}
