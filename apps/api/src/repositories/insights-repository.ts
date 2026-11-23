import type { OutlierQuery, PayMetric, PayStatsGroup, PayStatsQuery } from "@salary/shared";
import type { PrismaClient } from "../db/client.js";
import { Prisma } from "../generated/prisma/client.js";
import { FROM, whereClause } from "./employee-repository.js";

/** The pay figure used, in the employee's local currency. */
export function metricSql(metric: PayMetric): Prisma.Sql {
  return metric === "base"
    ? Prisma.sql`e."currentBaseSalary"`
    : Prisma.sql`(e."currentBaseSalary" + e."currentTargetBonus")`;
}

/** Group key and readable label per grouping (from a fixed allow-list, never user text). */
const GROUPS: Record<PayStatsGroup, { key: Prisma.Sql; label: Prisma.Sql; order: Prisma.Sql }> = {
  country: {
    key: Prisma.sql`e."countryCode"`,
    label: Prisma.sql`c.name`,
    order: Prisma.sql`label`,
  },
  department: { key: Prisma.sql`d.name`, label: Prisma.sql`d.name`, order: Prisma.sql`label` },
  jobTitle: { key: Prisma.sql`j.name`, label: Prisma.sql`j.name`, order: Prisma.sql`label` },
  level: {
    key: Prisma.sql`e.level::text`,
    label: Prisma.sql`'L' || e.level`,
    order: Prisma.sql`key::int`,
  },
};

export type PayStatsRowRaw = {
  key: string;
  label: string;
  headcount: number;
  min: number;
  median: number;
  average: number;
  max: number;
  total: number;
  currency: string;
};

/**
 * Pay statistics per group, computed in Postgres. `targetRateToUsd` converts every amount into
 * one currency (amount × own rate ÷ target rate); null keeps local amounts, which is only
 * meaningful when each group has a single currency (grouping by country).
 */
export async function findPayStats(
  prisma: PrismaClient,
  query: PayStatsQuery,
  target: { currency: string; rateToUsd: number } | null,
  options: { groupBy: PayStatsGroup | null },
): Promise<PayStatsRowRaw[]> {
  const value = target
    ? Prisma.sql`${metricSql(query.metric)} * f."rateToUsd" / ${target.rateToUsd}::float8`
    : Prisma.sql`${metricSql(query.metric)}::float8`;
  const currency = target ? Prisma.sql`${target.currency}` : Prisma.sql`e."currentCurrency"`;
  const group = options.groupBy ? GROUPS[options.groupBy] : null;

  return prisma.$queryRaw<PayStatsRowRaw[]>`
    SELECT key, label, COUNT(*)::int AS headcount,
           MIN(v)::float8 AS min,
           (percentile_cont(0.5) WITHIN GROUP (ORDER BY v))::float8 AS median,
           AVG(v)::float8 AS average,
           MAX(v)::float8 AS max,
           SUM(v)::float8 AS total,
           MIN(currency) AS currency
    FROM (
      SELECT ${group ? group.key : Prisma.sql`'all'`} AS key,
             ${group ? group.label : Prisma.sql`'All employees'`} AS label,
             ${value} AS v,
             ${currency}::text AS currency
      ${FROM}
      ${whereClause(query)}
    ) x
    GROUP BY key, label
    ORDER BY ${group ? group.order : Prisma.sql`key`}`;
}

export type OutlierRow = {
  employeeCode: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  jobTitle: string;
  level: number;
  pay: number;
  peerMedian: number;
  currency: string;
  ratio: number;
  peerCount: number;
};

export type OutlierSummaryRow = {
  peerGroups: number;
  employeesAnalysed: number;
  smallPeerGroups: number;
  employeesNotAnalysed: number;
  underpaid: number;
  overpaid: number;
};

/**
 * Every filtered employee with their peer group's size and median pay. Peers share job title,
 * level and country, so a group is always one currency and the ratio needs no conversion.
 */
function scoredEmployees(query: OutlierQuery): Prisma.Sql {
  return Prisma.sql`
    WITH base AS (
      SELECT e."employeeCode", e."firstName", e."lastName", e."countryCode", e."jobTitleId",
             j.name AS "jobTitle", e.level::int AS level, e."currentCurrency" AS currency,
             ${metricSql(query.metric)}::float8 AS pay
      ${FROM}
      ${whereClause(query)}
    ),
    peers AS (
      SELECT "countryCode", "jobTitleId", level, COUNT(*)::int AS "peerCount",
             (percentile_cont(0.5) WITHIN GROUP (ORDER BY pay))::float8 AS "peerMedian"
      FROM base
      GROUP BY "countryCode", "jobTitleId", level
    ),
    scored AS (
      SELECT b.*, p."peerCount", p."peerMedian", b.pay / p."peerMedian" AS ratio
      FROM base b JOIN peers p USING ("countryCode", "jobTitleId", level)
    )`;
}

function flaggedCondition(query: OutlierQuery): Prisma.Sql {
  const under = Prisma.sql`ratio < ${query.low}::float8`;
  const over = Prisma.sql`ratio > ${query.high}::float8`;
  const band =
    query.direction === "under"
      ? under
      : query.direction === "over"
        ? over
        : Prisma.sql`(${under} OR ${over})`;
  return Prisma.sql`"peerCount" >= ${query.minPeers} AND ${band}`;
}

/** Flagged employees, furthest from their peer median first (stable by code), one page. */
export async function findOutliers(
  prisma: PrismaClient,
  query: OutlierQuery,
): Promise<{ rows: OutlierRow[]; total: number }> {
  const flagged = flaggedCondition(query);
  const [rows, counts] = await Promise.all([
    prisma.$queryRaw<OutlierRow[]>`
      ${scoredEmployees(query)}
      SELECT "employeeCode", "firstName", "lastName", "countryCode", "jobTitle", level, pay,
             "peerMedian", currency, ratio, "peerCount"
      FROM scored
      WHERE ${flagged}
      ORDER BY ABS(ratio - 1) DESC, "employeeCode"
      LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`,
    prisma.$queryRaw<{ total: number }[]>`
      ${scoredEmployees(query)}
      SELECT COUNT(*)::int AS total FROM scored WHERE ${flagged}`,
  ]);
  return { rows, total: counts[0]?.total ?? 0 };
}

/** How much of the population could be judged, and how many fall outside the band. */
export async function findOutlierSummary(
  prisma: PrismaClient,
  query: OutlierQuery,
): Promise<OutlierSummaryRow> {
  const [summary] = await prisma.$queryRaw<OutlierSummaryRow[]>`
    ${scoredEmployees(query)}
    SELECT
      (SELECT COUNT(*) FROM peers WHERE "peerCount" >= ${query.minPeers})::int AS "peerGroups",
      (SELECT COALESCE(SUM("peerCount"), 0) FROM peers WHERE "peerCount" >= ${query.minPeers})::int AS "employeesAnalysed",
      (SELECT COUNT(*) FROM peers WHERE "peerCount" < ${query.minPeers})::int AS "smallPeerGroups",
      (SELECT COALESCE(SUM("peerCount"), 0) FROM peers WHERE "peerCount" < ${query.minPeers})::int AS "employeesNotAnalysed",
      (SELECT COUNT(*) FROM scored WHERE "peerCount" >= ${query.minPeers} AND ratio < ${query.low}::float8)::int AS underpaid,
      (SELECT COUNT(*) FROM scored WHERE "peerCount" >= ${query.minPeers} AND ratio > ${query.high}::float8)::int AS overpaid`;
  return summary!;
}
