import type { OUTLIER_DEFAULTS } from "../constants.js";

/** Reference data the UI needs for filters, labels and currency conversion. */
export type MetaResponse = {
  countries: { code: string; name: string; currency: string }[];
  /** Sorted by name; each department lists its job titles, also sorted. */
  departments: { name: string; jobTitles: string[] }[];
  levels: number[];
  fx: {
    /** ISO date the static rates apply to. */
    asOf: string;
    /** 1 unit of the currency = rate USD. */
    ratesToUsd: Record<string, number>;
  };
  outlierDefaults: typeof OUTLIER_DEFAULTS;
};
