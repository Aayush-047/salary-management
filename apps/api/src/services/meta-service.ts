import { LEVELS, OUTLIER_DEFAULTS, type MetaResponse } from "@salary/shared";
import type { PrismaClient } from "../db/client.js";
import { findReferenceData } from "../repositories/reference-repository.js";

export async function getMeta(prisma: PrismaClient): Promise<MetaResponse> {
  const { countries, departments, fxRates } = await findReferenceData(prisma);

  // All rates share one "as of" date; report the latest in case they ever diverge.
  const asOf = fxRates.reduce<Date | null>(
    (latest, rate) => (latest && latest > rate.asOfDate ? latest : rate.asOfDate),
    null,
  );

  return {
    countries,
    departments: departments.map((d) => ({
      name: d.name,
      jobTitles: d.jobTitles.map((t) => t.name),
    })),
    levels: [...LEVELS],
    fx: {
      asOf: asOf ? asOf.toISOString().slice(0, 10) : "",
      ratesToUsd: Object.fromEntries(fxRates.map((r) => [r.currency, r.rateToUsd])),
    },
    outlierDefaults: OUTLIER_DEFAULTS,
  };
}
