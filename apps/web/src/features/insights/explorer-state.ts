import {
  PayStatsQuerySchema,
  type PayStatsGroup,
  type PayStatsQuery,
  type PayStatsRow,
} from "@salary/shared";
import { appendParam, parseSearchParams } from "../../lib/search-params";

/** Explorer state kept in the URL. The currency comes from the global selector instead. */
const ExplorerStateSchema = PayStatsQuerySchema.omit({ currency: true });
export type ExplorerState = Omit<PayStatsQuery, "currency">;
export const DEFAULT_EXPLORER: ExplorerState = ExplorerStateSchema.parse({});

export function parseExplorer(params: URLSearchParams): ExplorerState {
  return parseSearchParams(ExplorerStateSchema, params);
}

/**
 * Explorer state → URL parameters (defaults left out). Filters use the same names as the
 * employee list, and other keys in `base` (e.g. the active tab) are kept.
 */
export function explorerParams(state: ExplorerState, base?: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  const tab = base?.get("tab");
  if (tab) params.set("tab", tab);
  if (state.groupBy !== DEFAULT_EXPLORER.groupBy) params.set("groupBy", state.groupBy);
  if (state.metric !== DEFAULT_EXPLORER.metric) params.set("metric", state.metric);
  if (state.status !== DEFAULT_EXPLORER.status) params.set("status", state.status);
  appendParam(params, "country", state.country);
  appendParam(params, "department", state.department);
  appendParam(params, "jobTitle", state.jobTitle);
  appendParam(params, "level", state.level);
  return params;
}

/**
 * Bars for the chart: ranked by median, largest first, so groups compare at a glance.
 * Levels keep their natural order (L1 → L6), where ranking would hide the progression.
 */
export function toChartRows(rows: readonly PayStatsRow[], groupBy: PayStatsGroup): PayStatsRow[] {
  const sorted = [...rows];
  if (groupBy === "level") sorted.sort((a, b) => Number(a.key) - Number(b.key));
  else sorted.sort((a, b) => b.median - a.median || a.label.localeCompare(b.label));
  return sorted;
}

/**
 * Orders table rows like the chart. In LOCAL a by-country table mixes currencies, so it must
 * not rank itself by raw amounts (¥7.6M would top €69k); it follows the chart's single-currency
 * ranking instead. Rows missing from the reference go last.
 */
export function orderLike(
  rows: readonly PayStatsRow[],
  reference: readonly PayStatsRow[],
): PayStatsRow[] {
  const position = new Map(reference.map((row, index) => [row.key, index]));
  return [...rows].sort(
    (a, b) => (position.get(a.key) ?? Infinity) - (position.get(b.key) ?? Infinity),
  );
}
