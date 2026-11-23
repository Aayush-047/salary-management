import { z } from "zod";
import type { CompensationReason } from "../constants.js";
import { IsoDateSchema } from "./employee-inputs.js";
import { EmployeeFilterFields } from "./employees.js";
import { OutlierParamsSchema } from "./outliers.js";

/** Which pay figure an insight uses: base salary, or total cash (base + target bonus). */
export const PAY_METRICS = ["base", "total"] as const;
export type PayMetric = (typeof PAY_METRICS)[number];

export const PAY_STATS_GROUPS = ["country", "department", "jobTitle", "level"] as const;
export type PayStatsGroup = (typeof PAY_STATS_GROUPS)[number];

/**
 * "LOCAL" keeps each employee's own currency where that is meaningful; any other value is a
 * currency code to convert into (checked against the FX table by the API).
 */
export const LOCAL_CURRENCY = "LOCAL";
export const DisplayCurrencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^(LOCAL|[A-Z]{3})$/, "Use LOCAL or a three-letter currency code")
  .default(LOCAL_CURRENCY);

export const PayStatsQuerySchema = z.object({
  ...EmployeeFilterFields,
  groupBy: z.enum(PAY_STATS_GROUPS).default("country"),
  metric: z.enum(PAY_METRICS).default("total"),
  currency: DisplayCurrencySchema,
});
export type PayStatsQuery = z.infer<typeof PayStatsQuerySchema>;

export const OutlierQuerySchema = OutlierParamsSchema.extend({
  ...EmployeeFilterFields,
  metric: z.enum(PAY_METRICS).default("base"),
  direction: z.enum(["both", "under", "over"]).default("both"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type OutlierQuery = z.infer<typeof OutlierQuerySchema>;

/** Defaults to the last 12 months when `from` / `to` are omitted (computed by the API). */
export const RecentChangesQuerySchema = z
  .object({
    ...EmployeeFilterFields,
    from: IsoDateSchema.optional(),
    to: IsoDateSchema.optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "The start date must be on or before the end date",
    path: ["from"],
  });
export type RecentChangesQuery = z.infer<typeof RecentChangesQuerySchema>;

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export type PayStatsRow = {
  /** Group value, e.g. "DE", "Engineering", "Software Engineer" or "3". */
  key: string;
  /** Readable name, e.g. "Germany" or "L3". */
  label: string;
  headcount: number;
  min: number;
  median: number;
  average: number;
  max: number;
  /** Sum of the metric: the group's annual payroll for base or total cash. */
  total: number;
  /** Currency the figures are in (a group's own currency when grouping by country in LOCAL). */
  currency: string;
};

export type PayStatsResponse = {
  groupBy: PayStatsGroup;
  metric: PayMetric;
  /** The requested display currency (LOCAL or a code). */
  currency: string;
  /** Whole organisation (after filters), always in one currency. */
  overall: PayStatsRow | null;
  rows: PayStatsRow[];
  fxAsOf: string;
};

export type OutlierItem = {
  employeeCode: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  jobTitle: string;
  level: number;
  /** Pay in the employee's local currency (the metric chosen). */
  pay: number;
  peerMedian: number;
  currency: string;
  /** pay ÷ peer median, rounded to 2 decimals. */
  compaRatio: number;
  /** Employees in the peer group (same title, level and country), including this one. */
  peerCount: number;
  direction: "under" | "over";
};

export type OutlierResponse = {
  items: OutlierItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: {
    /** Peer groups large enough to judge, and the employees in them. */
    peerGroups: number;
    employeesAnalysed: number;
    /** Peer groups smaller than minPeers (not judged), and the employees in them. */
    smallPeerGroups: number;
    employeesNotAnalysed: number;
    underpaid: number;
    overpaid: number;
  };
};

export type RaiseItem = {
  employeeCode: string;
  firstName: string;
  lastName: string;
  effectiveDate: string;
  reason: CompensationReason;
  previousBase: number;
  newBase: number;
  currency: string;
  raisePct: number;
};

export type RecentChangesResponse = {
  from: string;
  to: string;
  summary: {
    changes: number;
    employees: number;
    averageRaisePct: number | null;
    medianRaisePct: number | null;
  };
  byReason: { reason: CompensationReason; changes: number; averageRaisePct: number }[];
  topRaises: RaiseItem[];
};
