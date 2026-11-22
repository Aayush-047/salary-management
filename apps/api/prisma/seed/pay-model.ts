/**
 * Pay model for generated employees:
 *   base pay = country base × title factor × level factor (before random spread)
 *   target bonus = base × level bonus % (doubled for sales titles)
 * Pure data and functions; amounts are whole units of local currency.
 */

/** Base pay of a Software Engineer at L3, in local currency. */
export const COUNTRY_BASE: Readonly<Record<string, number>> = {
  US: 140_000,
  GB: 75_000,
  DE: 75_000,
  SG: 110_000,
  JP: 8_500_000,
  BR: 180_000,
  IN: 2_200_000,
};

export const LEVEL_FACTOR: Readonly<Record<number, number>> = {
  1: 0.62,
  2: 0.8,
  3: 1.0,
  4: 1.25,
  5: 1.55,
  6: 1.9,
};

export const LEVEL_BONUS_RATE: Readonly<Record<number, number>> = {
  1: 0.05,
  2: 0.07,
  3: 0.1,
  4: 0.12,
  5: 0.15,
  6: 0.2,
};

/** Pay relative to a Software Engineer at the same level and country. */
export const TITLE_FACTOR: Readonly<Record<string, number>> = {
  "Software Engineer": 1.0,
  "QA Engineer": 0.85,
  "DevOps Engineer": 1.0,
  "Engineering Manager": 1.25,
  "Data Analyst": 0.85,
  "Data Scientist": 1.05,
  "Product Manager": 1.1,
  "Product Designer": 0.95,
  "Account Executive": 0.9,
  "Sales Development Representative": 0.65,
  "Marketing Specialist": 0.8,
  "Customer Support Specialist": 0.55,
  "Financial Analyst": 0.85,
  "HR Business Partner": 0.85,
  Recruiter: 0.7,
  "Operations Analyst": 0.75,
};

/** Sales pay is more variable, so these titles get double the level's bonus rate. */
export const SALES_TITLES: ReadonlySet<string> = new Set([
  "Account Executive",
  "Sales Development Representative",
]);

/** Titles that only exist at some levels; all others span L1–L6. */
export const TITLE_LEVEL_RANGE: Readonly<Record<string, readonly [min: number, max: number]>> = {
  "Engineering Manager": [4, 6],
  "Sales Development Representative": [1, 3],
};

/** Rounding step per currency so amounts look like real salaries. */
const ROUNDING_STEP: Readonly<Record<string, number>> = { JPY: 10_000, INR: 1_000 };
const DEFAULT_ROUNDING_STEP = 100;

function lookup<T>(
  table: Readonly<Record<string | number, T>>,
  key: string | number,
  what: string,
): T {
  const value = table[key];
  if (value === undefined) {
    throw new Error(`No ${what} for "${key}"`);
  }
  return value;
}

export function levelRange(title: string): readonly [number, number] {
  return TITLE_LEVEL_RANGE[title] ?? [1, 6];
}

export function bonusRate(title: string, level: number): number {
  const rate = lookup(LEVEL_BONUS_RATE, level, "bonus rate for level");
  return SALES_TITLES.has(title) ? rate * 2 : rate;
}

/** Rounds to the currency's step (e.g. ¥10,000), never below one step. */
export function roundPay(amount: number, currency: string): number {
  const step = ROUNDING_STEP[currency] ?? DEFAULT_ROUNDING_STEP;
  return Math.max(step, Math.round(amount / step) * step);
}

/** Model base pay (before random spread) for a country, title and level. */
export function modelBasePay(countryCode: string, title: string, level: number): number {
  return (
    lookup(COUNTRY_BASE, countryCode, "base pay for country") *
    lookup(TITLE_FACTOR, title, "pay factor for title") *
    lookup(LEVEL_FACTOR, level, "pay factor for level")
  );
}
