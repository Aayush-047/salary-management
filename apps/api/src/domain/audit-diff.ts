import type { AuditFieldChange } from "@salary/shared";
import { toIsoDate } from "./clock.js";

type Value = string | number | boolean | Date | null | undefined;

/** Dates are compared and stored as YYYY-MM-DD; missing values become null. */
function normalise(value: Value): string | number | boolean | null {
  if (value instanceof Date) return toIsoDate(value);
  return value ?? null;
}

/**
 * The audit log's `changes`: one entry per field whose value differs, in the order the
 * fields are listed. Fields absent from `after` are treated as unchanged.
 */
export function diffFields<K extends string>(
  before: Partial<Record<K, Value>>,
  after: Partial<Record<K, Value>>,
  fields: readonly K[],
): AuditFieldChange[] {
  const changes: AuditFieldChange[] = [];
  for (const field of fields) {
    if (!(field in after)) continue;
    const from = normalise(before[field]);
    const to = normalise(after[field]);
    if (from !== to) changes.push({ field, from, to });
  }
  return changes;
}
