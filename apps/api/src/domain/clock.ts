/** Source of "now". Injected so tests can pin the date and stay deterministic. */
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();

/** Today's date in UTC as YYYY-MM-DD. */
export function todayIso(clock: Clock): string {
  return clock().toISOString().slice(0, 10);
}

/** A DATE column value (midnight UTC) as YYYY-MM-DD. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** YYYY-MM-DD → Date at midnight UTC, the form Prisma uses for DATE columns. */
export function fromIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}
