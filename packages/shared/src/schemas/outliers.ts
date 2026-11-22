import { z } from "zod";
import { OUTLIER_DEFAULTS } from "../constants.js";

/**
 * Parameters for peer outlier detection. Values are coerced because they usually
 * arrive as query-string text (e.g. "0.8").
 */
export const OutlierParamsSchema = z.object({
  low: z.coerce.number().gt(0).lt(1).default(OUTLIER_DEFAULTS.low),
  high: z.coerce.number().gt(1).max(5).default(OUTLIER_DEFAULTS.high),
  minPeers: z.coerce.number().int().min(2).max(100).default(OUTLIER_DEFAULTS.minPeers),
});

export type OutlierParams = z.infer<typeof OutlierParamsSchema>;
