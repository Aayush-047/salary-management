import type { AuditAction, AuditEntity, CompensationReason } from "../constants.js";
import type { EmployeeListItem } from "../schemas/employees.js";

/** One entry in an employee's pay timeline. */
export type CompensationEntryView = {
  id: number;
  /** ISO date, YYYY-MM-DD. */
  effectiveDate: string;
  baseSalary: number;
  targetBonus: number;
  totalCash: number;
  currency: string;
  reason: CompensationReason;
  note: string | null;
  /**
   * Base salary change versus the previous entry, e.g. 0.05 for +5%.
   * Null for the first entry, and when the currency changed (relocation).
   */
  baseChangePct: number | null;
};

/** Everything the detail page shows; the timeline is newest first. */
export type EmployeeDetail = EmployeeListItem & {
  compensation: CompensationEntryView[];
};

export type AuditFieldChange = {
  field: string;
  from: unknown;
  to: unknown;
};

export type AuditEntryView = {
  id: number;
  /** ISO timestamp. */
  createdAt: string;
  actor: { id: number; name: string };
  action: AuditAction;
  entityType: AuditEntity;
  entityId: number;
  changes: AuditFieldChange[];
  reason: string | null;
};

export type AuditListResponse = {
  items: AuditEntryView[];
};
