import { z } from "zod";
import { LEVELS, type EmployeeStatus } from "../constants.js";

/** Accepts `?x=a` and `?x=a&x=b` alike, always yielding an array (or undefined). */
function multiValue<T extends z.ZodType>(item: T) {
  return z.preprocess(
    (value) => (value === undefined || Array.isArray(value) ? value : [value]),
    z.array(item).min(1).max(50).optional(),
  );
}

export const EMPLOYEE_SORT_FIELDS = [
  "name",
  "employeeCode",
  "hireDate",
  "level",
  "baseSalary",
  "totalCash",
] as const;
export type EmployeeSortField = (typeof EMPLOYEE_SORT_FIELDS)[number];

export const EMPLOYEE_STATUS_FILTERS = ["ACTIVE", "TERMINATED", "ALL"] as const;

export const EmployeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((s) => (s ? s : undefined)),
  country: multiValue(z.string().trim().toUpperCase().length(2)),
  department: multiValue(z.string().trim().min(1).max(100)),
  jobTitle: multiValue(z.string().trim().min(1).max(100)),
  level: multiValue(
    z.coerce
      .number()
      .int()
      .min(LEVELS[0])
      .max(LEVELS[LEVELS.length - 1]!),
  ),
  /** Leavers are excluded unless asked for. */
  status: z.enum(EMPLOYEE_STATUS_FILTERS).default("ACTIVE"),
  /** Pay sorts compare USD-equivalent values, so different currencies rank correctly. */
  sortBy: z.enum(EMPLOYEE_SORT_FIELDS).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export type EmployeeListQuery = z.infer<typeof EmployeeListQuerySchema>;

export type EmployeeListItem = {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  country: { code: string; name: string };
  department: string;
  jobTitle: string;
  level: number;
  status: EmployeeStatus;
  /** ISO date, YYYY-MM-DD. */
  hireDate: string;
  terminationDate: string | null;
  /** Whole units of `currency` (the employee's local currency). */
  baseSalary: number;
  targetBonus: number;
  totalCash: number;
  currency: string;
};

export type EmployeeListResponse = {
  items: EmployeeListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
