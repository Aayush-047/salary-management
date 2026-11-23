import { z } from "zod";
import { AUDIT_ACTIONS } from "../constants.js";
import type { AuditEntryView } from "../types/employee-detail.js";
import { IsoDateSchema } from "./employee-inputs.js";

/** Organisation-wide audit log: newest first, filtered by period, action and employee. */
export const AuditLogQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
    from: IsoDateSchema.optional(),
    to: IsoDateSchema.optional(),
    action: z.enum(AUDIT_ACTIONS).optional(),
    /** Employee name or code, anywhere in the text. */
    search: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((s) => (s ? s : undefined)),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "The start date must be on or before the end date",
    path: ["from"],
  });
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

export type OrgAuditEntry = AuditEntryView & {
  employee: { employeeCode: string; firstName: string; lastName: string };
};

export type AuditLogResponse = {
  items: OrgAuditEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
