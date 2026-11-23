import { AuditLogQuerySchema, type AuditAction } from "@salary/shared";
import { parseSearchParams } from "../../lib/search-params";

export const DEFAULT_AUDIT = AuditLogQuerySchema.parse({});

export const parseAuditLog = (params: URLSearchParams) =>
  parseSearchParams(AuditLogQuerySchema, params);

/** Labels for the action filter, in the words used on the page. */
export const ACTION_FILTERS: { value: AuditAction | "ALL"; label: string }[] = [
  { value: "ALL", label: "All changes" },
  { value: "CREATE", label: "Created" },
  { value: "UPDATE", label: "Updated" },
  { value: "TERMINATE", label: "Left" },
];
