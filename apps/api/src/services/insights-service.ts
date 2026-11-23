import {
  LOCAL_CURRENCY,
  type PayStatsQuery,
  type PayStatsResponse,
  type PayStatsRow,
} from "@salary/shared";
import type { PrismaClient } from "../db/client.js";
import { toIsoDate } from "../domain/clock.js";
import { invalid } from "../domain/errors.js";
import { findPayStats, type PayStatsRowRaw } from "../repositories/insights-repository.js";

/** Figures mixing several countries need one currency; USD unless the user picked another. */
const REPORTING_CURRENCY = "USD";

/** Amounts are whole units, like every other amount in the app. */
function round(row: PayStatsRowRaw): PayStatsRow {
  return {
    ...row,
    min: Math.round(row.min),
    median: Math.round(row.median),
    average: Math.round(row.average),
    max: Math.round(row.max),
    total: Math.round(row.total),
  };
}

async function requireRate(prisma: PrismaClient, currency: string) {
  const rate = await prisma.fxRate.findUnique({ where: { currency } });
  if (!rate) throw invalid("UNKNOWN_CURRENCY", `No exchange rate for ${currency}`);
  return rate;
}

/**
 * Pay statistics per group plus a whole-organisation row. With LOCAL, a by-country breakdown
 * keeps each country's own currency (exact, no conversion); any breakdown that mixes countries,
 * and the overall row, use USD.
 */
export async function getPayStats(
  prisma: PrismaClient,
  query: PayStatsQuery,
): Promise<PayStatsResponse> {
  const local = query.currency === LOCAL_CURRENCY;
  const reporting = await requireRate(prisma, local ? REPORTING_CURRENCY : query.currency);
  const target = { currency: reporting.currency, rateToUsd: reporting.rateToUsd };

  const groupTarget = local && query.groupBy === "country" ? null : target;
  const [rows, overall] = await Promise.all([
    findPayStats(prisma, query, groupTarget, { groupBy: query.groupBy }),
    findPayStats(prisma, query, target, { groupBy: null }),
  ]);

  return {
    groupBy: query.groupBy,
    metric: query.metric,
    currency: query.currency,
    overall: overall[0] ? round(overall[0]) : null,
    rows: rows.map(round),
    fxAsOf: toIsoDate(reporting.asOfDate),
  };
}
