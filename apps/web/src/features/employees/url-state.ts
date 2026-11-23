import { EmployeeListQuerySchema, type EmployeeListQuery } from "@salary/shared";
import { parseSearchParams } from "../../lib/search-params";

/** The list state when the URL has no parameters. */
export const DEFAULT_QUERY: EmployeeListQuery = EmployeeListQuerySchema.parse({});

const MULTI_VALUE_KEYS = ["country", "department", "jobTitle", "level"] as const;
const FILTER_KEYS = ["search", "status", ...MULTI_VALUE_KEYS] as const;

/**
 * Reads the list state from the URL using the same schema the API validates with.
 * Invalid parameters (e.g. a hand-edited `level=9`) are dropped instead of breaking the page.
 */
export function parseListQuery(params: URLSearchParams): EmployeeListQuery {
  return parseSearchParams(EmployeeListQuerySchema, params);
}

/** List state → URL parameters, leaving out defaults so URLs stay short. */
export function toSearchParams(query: EmployeeListQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  for (const key of MULTI_VALUE_KEYS) {
    for (const value of query[key] ?? []) params.append(key, String(value));
  }
  if (query.status !== DEFAULT_QUERY.status) params.set("status", query.status);
  if (query.sortBy !== DEFAULT_QUERY.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDir !== DEFAULT_QUERY.sortDir) params.set("sortDir", query.sortDir);
  if (query.pageSize !== DEFAULT_QUERY.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.page !== DEFAULT_QUERY.page) params.set("page", String(query.page));
  return params;
}

/**
 * Applies a change to the list state. Anything other than a page change sends the user
 * back to page 1, because the old page number no longer means anything.
 */
export function applyChange(
  current: EmployeeListQuery,
  change: Partial<EmployeeListQuery>,
): EmployeeListQuery {
  const next = { ...current, ...change };
  if (!("page" in change)) next.page = 1;
  // Empty selections mean "no filter", not "match nothing".
  for (const key of MULTI_VALUE_KEYS) {
    if (next[key]?.length === 0) delete next[key];
  }
  if (!next.search) delete next.search;
  return next;
}

/**
 * Turns the filter modal's values into a change that sets *every* filter explicitly.
 * A filter missing from the values (e.g. after "Reset") must be cleared, not kept,
 * because applyChange keeps any key the change doesn't mention.
 */
export function filterChange(
  values: Pick<EmployeeListQuery, "status" | (typeof MULTI_VALUE_KEYS)[number]>,
): Partial<EmployeeListQuery> {
  return {
    status: values.status,
    country: values.country ?? [],
    department: values.department ?? [],
    jobTitle: values.jobTitle ?? [],
    level: values.level ?? [],
  };
}

/** Clears search, filters and status; keeps sorting and page size. */
export function clearFilters(current: EmployeeListQuery): EmployeeListQuery {
  const next = { ...current, page: 1, status: DEFAULT_QUERY.status };
  for (const key of FILTER_KEYS) {
    if (key !== "status") delete next[key];
  }
  return next;
}

export function hasActiveFilters(query: EmployeeListQuery): boolean {
  return (
    Boolean(query.search) ||
    query.status !== DEFAULT_QUERY.status ||
    MULTI_VALUE_KEYS.some((key) => (query[key]?.length ?? 0) > 0)
  );
}
