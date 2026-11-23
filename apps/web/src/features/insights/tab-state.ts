import { OutlierQuerySchema, RecentChangesQuerySchema } from "@salary/shared";
import { appendParam, parseSearchParams } from "../../lib/search-params";

/**
 * Writes a tab's state to URL parameters: the active tab first, then every value that differs
 * from the schema default (lists repeated, e.g. country=DE&country=GB). Keeps URLs short.
 */
export function stateParams(
  state: Record<string, unknown>,
  defaults: Record<string, unknown>,
  base?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams();
  const tab = base?.get("tab");
  if (tab) params.set("tab", tab);
  for (const [key, value] of Object.entries(state)) {
    if (value === undefined || value === defaults[key]) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    appendParam(params, key, value as string | number | (string | number)[]);
  }
  return params;
}

export const DEFAULT_OUTLIERS = OutlierQuerySchema.parse({});
export const parseOutliers = (params: URLSearchParams) =>
  parseSearchParams(OutlierQuerySchema, params);

export const DEFAULT_RECENT = RecentChangesQuerySchema.parse({});
export const parseRecent = (params: URLSearchParams) =>
  parseSearchParams(RecentChangesQuerySchema, params);

/** Band limits for the slider: the band must contain 1.00 (low < 1 < high). */
export const BAND_MIN = 0.5;
export const BAND_MAX = 1.5;
export const BAND_STEP = 0.05;

/** Keeps a slider band valid: low at most 0.95, high at least 1.05, two decimals. */
export function clampBand([low, high]: [number, number]): [number, number] {
  const round = (n: number) => Math.round(n * 100) / 100;
  return [round(Math.min(low, 1 - BAND_STEP)), round(Math.max(high, 1 + BAND_STEP))];
}
