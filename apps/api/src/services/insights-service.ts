import {
  LOCAL_CURRENCY,
  type CompensationReason,
  type RecentChangesQuery,
  type RecentChangesResponse,
  type OutlierQuery,
  type OutlierResponse,
  type PayStatsQuery,
  type PayStatsResponse,
  type PayStatsRow,
} from "@salary/shared";
import type { PrismaClient } from "../db/client.js";
import { lastTwelveMonths, latestAllowedDate, toIsoDate, type Clock } from "../domain/clock.js";
import { invalid } from "../domain/errors.js";
import {
  findOutlierSummary,
  findOutliers,
  findPayStats,
  findRecentChanges,
  type PayStatsRowRaw,
} from "../repositories/insights-repository.js";

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

/** pay ÷ peer median, rounded for display (flagging uses the exact ratio). */
function roundRatio(ratio: number): number {
  return Math.round(ratio * 100) / 100;
}

/**
 * Employees paid outside the band around their peer-group median. Peer groups smaller than
 * minPeers are not judged: with two people, one is always "off".
 */
export async function getOutliers(
  prisma: PrismaClient,
  query: OutlierQuery,
): Promise<OutlierResponse> {
  const [{ rows, total }, summary] = await Promise.all([
    findOutliers(prisma, query),
    findOutlierSummary(prisma, query),
  ]);
  return {
    items: rows.map((row) => ({
      employeeCode: row.employeeCode,
      firstName: row.firstName,
      lastName: row.lastName,
      countryCode: row.countryCode,
      jobTitle: row.jobTitle,
      level: row.level,
      pay: Math.round(row.pay),
      peerMedian: Math.round(row.peerMedian),
      currency: row.currency,
      compaRatio: roundRatio(row.ratio),
      peerCount: row.peerCount,
      direction: row.ratio < 1 ? "under" : "over",
    })),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
    summary,
  };
}

const TOP_RAISES = 10;

/** Fractions like 0.0566 (5.66%), to four decimals as elsewhere in the API. */
function roundPct(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/** Raises in a period (default: the last 12 months up to today). */
export async function getRecentChanges(
  prisma: PrismaClient,
  clock: Clock,
  query: RecentChangesQuery,
): Promise<RecentChangesResponse> {
  const defaults = lastTwelveMonths(latestAllowedDate(clock));
  const period = { from: query.from ?? defaults.from, to: query.to ?? defaults.to };
  const { summary, byReason, top } = await findRecentChanges(prisma, query, period, TOP_RAISES);

  return {
    ...period,
    summary: {
      changes: summary.changes,
      employees: summary.employees,
      averageRaisePct: summary.averageRaisePct === null ? null : roundPct(summary.averageRaisePct),
      medianRaisePct: summary.medianRaisePct === null ? null : roundPct(summary.medianRaisePct),
    },
    byReason: byReason.map((row) => ({
      reason: row.reason as CompensationReason,
      changes: row.changes,
      averageRaisePct: roundPct(row.averageRaisePct),
    })),
    topRaises: top.map((row) => ({
      employeeCode: row.employeeCode,
      firstName: row.firstName,
      lastName: row.lastName,
      effectiveDate: toIsoDate(row.effectiveDate),
      reason: row.reason as CompensationReason,
      previousBase: row.previousBase,
      newBase: row.newBase,
      currency: row.currency,
      raisePct: roundPct(row.raisePct),
    })),
  };
}
