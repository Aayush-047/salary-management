/** Source of "now". Injected so tests can pin the date and stay deterministic. */
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();

/** Hours the furthest-ahead time zone (UTC+14) is ahead of UTC. */
const MAX_UTC_OFFSET_HOURS = 14;

/**
 * The latest date that is not in the future anywhere: the calendar date in UTC+14. Users work
 * in many time zones (an HR manager in Singapore is a day ahead of UTC each morning), so
 * "no future dates" must not reject a date that is already today for them.
 */
export function latestAllowedDate(clock: Clock): string {
  return new Date(clock().getTime() + MAX_UTC_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
}

/** A DATE column value (midnight UTC) as YYYY-MM-DD. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** YYYY-MM-DD → Date at midnight UTC, the form Prisma uses for DATE columns. */
export function fromIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/**
 * The 12 months ending on `to` (inclusive): from the day after the same date a year earlier.
 * A leap day maps to the 1st of March, since the previous year has no 29 February.
 */
export function lastTwelveMonths(to: string): { from: string; to: string } {
  const [year, month, day] = to.split("-").map(Number) as [number, number, number];
  const yearAgo = new Date(Date.UTC(year - 1, month - 1, day));
  if (yearAgo.getUTCMonth() !== month - 1) yearAgo.setUTCDate(0); // 29 Feb → 28 Feb
  yearAgo.setUTCDate(yearAgo.getUTCDate() + 1);
  return { from: toIsoDate(yearAgo), to };
}
