import type {
  AuditAction,
  AuditEntity,
  AuditFieldChange,
  CompensationReason,
} from "@salary/shared";

const REASON_LABELS: Record<CompensationReason, string> = {
  HIRE: "Hire",
  MERIT: "Merit increase",
  PROMOTION: "Promotion",
  MARKET_ADJUSTMENT: "Market adjustment",
  RELOCATION: "Relocation",
  OTHER: "Other",
};

export function reasonLabel(reason: CompensationReason): string {
  return REASON_LABELS[reason];
}

/** "+5.7%", "−3.0%", "0.0%"; null when there is no comparable previous entry. */
export function formatChangePct(pct: number | null): string | null {
  if (pct === null) return null;
  const value = (Math.abs(pct) * 100).toFixed(1);
  if (pct > 0) return `+${value}%`;
  if (pct < 0) return `−${value}%`;
  return `${value}%`;
}

const FIELD_LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  country: "Country",
  currency: "Currency",
  jobTitle: "Job title",
  level: "Level",
  hireDate: "Hire date",
  terminationDate: "Termination date",
  status: "Status",
  baseSalary: "Base salary",
  targetBonus: "Target bonus",
  effectiveDate: "Effective date",
  payReason: "Reason",
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

/** A value from the audit log as text: numbers grouped, levels as L3, reasons as words. */
export function formatAuditValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "level") return `L${String(value)}`;
  if (field === "payReason") return reasonLabel(value as CompensationReason);
  if (typeof value === "number") return value.toLocaleString("en-US");
  return String(value);
}

/** One-line summary of an audit entry, e.g. "Promoted", "Pay corrected", "Relocated". */
export function auditHeadline(entry: {
  action: AuditAction;
  entityType: AuditEntity;
  changes: readonly AuditFieldChange[];
}): string {
  const fields = new Set(entry.changes.map((c) => c.field));
  const payReason = entry.changes.find((c) => c.field === "payReason")?.to;

  if (entry.action === "TERMINATE") return "Left the company";
  if (entry.entityType === "EMPLOYEE" && entry.action === "CREATE") return "Employee created";
  if (entry.entityType === "EMPLOYEE" && fields.has("country")) return "Relocated";
  if (entry.entityType === "EMPLOYEE") return "Profile updated";
  if (entry.action === "UPDATE") return "Pay entry corrected";
  if (payReason === "PROMOTION") return "Promoted";
  return "Pay changed";
}
