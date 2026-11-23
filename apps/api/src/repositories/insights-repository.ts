import type { PayMetric, PayStatsGroup, PayStatsQuery } from "@salary/shared";
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
