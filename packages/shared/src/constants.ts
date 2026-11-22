/**
 * Domain constants shared by the API and the web app.
 * The enum-like lists must match the Prisma enums; a test in apps/api enforces this.
 */

export const LEVELS = [1, 2, 3, 4, 5, 6] as const;
export type Level = (typeof LEVELS)[number];

export const EMPLOYEE_STATUSES = ["ACTIVE", "TERMINATED"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const COMPENSATION_REASONS = [
  "HIRE",
  "PROMOTION",
  "MERIT",
  "MARKET_ADJUSTMENT",
  "OTHER",
] as const;
export type CompensationReason = (typeof COMPENSATION_REASONS)[number];

export const AUDIT_ACTIONS = ["CREATE", "UPDATE", "TERMINATE"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITIES = ["EMPLOYEE", "COMPENSATION_ENTRY"] as const;
export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

/** Peer outlier defaults: flag compa-ratios outside [low, high] in peer groups of at least minPeers. */
export const OUTLIER_DEFAULTS = { low: 0.8, high: 1.2, minPeers: 5 } as const;
