import type { CompensationReason, EmployeeStatus } from "@salary/shared";
import { NAMES } from "./names.js";
import { bonusRate, levelRange, modelBasePay, roundPay } from "./pay-model.js";
import { createRandom, type Random } from "./random.js";
import { COUNTRIES, DEPARTMENTS } from "./reference-data.js";

// ---------------------------------------------------------------------------
// Workforce mix (weights are relative; they don't need to sum to 100)
// ---------------------------------------------------------------------------

export const COUNTRY_WEIGHTS: readonly (readonly [string, number])[] = [
  ["US", 30],
  ["IN", 22],
  ["GB", 12],
  ["DE", 12],
  ["BR", 9],
  ["SG", 8],
  ["JP", 7],
];

export const LEVEL_WEIGHTS: readonly (readonly [number, number])[] = [
  [1, 15],
  [2, 25],
  [3, 25],
  [4, 18],
  [5, 12],
  [6, 5],
];

export const DEPARTMENT_WEIGHTS: readonly (readonly [string, number])[] = [
  ["Engineering", 35],
  ["Sales", 14],
  ["Customer Support", 12],
  ["Data", 8],
  ["Operations", 7],
  ["Product", 6],
  ["Marketing", 6],
  ["Design", 4],
  ["Finance", 4],
  ["People", 4],
];

/** Title weights within departments that have more than one title. */
const TITLE_WEIGHTS: Readonly<Record<string, readonly (readonly [string, number])[]>> = {
  Engineering: [
    ["Software Engineer", 60],
    ["QA Engineer", 15],
    ["DevOps Engineer", 15],
    ["Engineering Manager", 10],
  ],
  Data: [
    ["Data Analyst", 55],
    ["Data Scientist", 45],
  ],
  Sales: [
    ["Account Executive", 60],
    ["Sales Development Representative", 40],
  ],
  People: [
    ["HR Business Partner", 50],
    ["Recruiter", 50],
  ],
};

export const TERMINATION_RATE = 0.06;
/** Share of active employees whose pay is deliberately pushed far from their peers. */
export const OUTLIER_RATE = 0.02;
/** Natural pay spread around the model: ±10%. */
const PAY_SPREAD = 0.1;
const MAX_TENURE_DAYS = 10 * 365;
/** Tenure = max × r^skew; skew > 1 makes recent hires more common. */
const TENURE_SKEW = 1.6;
const MIN_TENURE_FOR_TERMINATION_DAYS = 180;
const MIN_DAYS_BEFORE_TERMINATION = 90;
const MAX_PAY_CHANGES = 4;
const PROMOTION_CHANCE = 0.3;
const MARKET_ADJUSTMENT_CHANCE = 0.1;

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export type GeneratedEntry = {
  effectiveDate: Date;
  baseSalary: number;
  targetBonus: number;
  currency: string;
  reason: CompensationReason;
};

export type GeneratedEmployee = {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  department: string;
  jobTitle: string;
  level: number;
  hireDate: Date;
  status: EmployeeStatus;
  terminationDate: Date | null;
  currentBaseSalary: number;
  currentTargetBonus: number;
  currentCurrency: string;
  /** Oldest first; the first entry is the hire, the last equals current pay. */
  entries: GeneratedEntry[];
};

export type GenerationResult = {
  employees: GeneratedEmployee[];
  /** Employee codes of deliberately planted outliers, for verifying outlier detection. */
  plantedOutliers: { underpaid: string[]; overpaid: string[] };
};

export type GenerateOptions = {
  seed: number;
  count: number;
  /** "Today" for the generated data; the wall clock is never used. */
  referenceDate: Date;
};

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

const CURRENCY_BY_COUNTRY = new Map(COUNTRIES.map((c) => [c.code, c.currency]));

function titleWeights(department: string): readonly (readonly [string, number])[] {
  const weighted = TITLE_WEIGHTS[department];
  if (weighted) return weighted;
  const titles = DEPARTMENTS[department];
  if (!titles) throw new Error(`Unknown department "${department}"`);
  return titles.map((title) => [title, 1] as const);
}

function levelWeights(title: string): readonly (readonly [number, number])[] {
  const [min, max] = levelRange(title);
  return LEVEL_WEIGHTS.filter(([level]) => level >= min && level <= max);
}

/** Lowercase ASCII email local part, e.g. "Schröder" → "schroder". */
function emailPart(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents left as combining marks by NFD
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/** n distinct day offsets in [1, maxOffset], ascending. */
function distinctOffsets(random: Random, n: number, maxOffset: number): number[] {
  const offsets = new Set<number>();
  while (offsets.size < n) offsets.add(random.int(1, maxOffset));
  return [...offsets].sort((a, b) => a - b);
}

export function generateEmployees({
  seed,
  count,
  referenceDate,
}: GenerateOptions): GenerationResult {
  const random = createRandom(seed);
  const emailCounts = new Map<string, number>();
  const employees: GeneratedEmployee[] = [];
  const plantedOutliers: GenerationResult["plantedOutliers"] = { underpaid: [], overpaid: [] };

  for (let i = 1; i <= count; i++) {
    const employeeCode = `E${String(i).padStart(5, "0")}`;

    // Who and where
    const countryCode = random.weighted(COUNTRY_WEIGHTS);
    const currency = CURRENCY_BY_COUNTRY.get(countryCode);
    const names = NAMES[countryCode];
    if (!currency || !names) throw new Error(`Incomplete reference data for "${countryCode}"`);
    const department = random.weighted(DEPARTMENT_WEIGHTS);
    const jobTitle = random.weighted(titleWeights(department));
    const level = random.weighted(levelWeights(jobTitle));
    const firstName = random.pick(names.first);
    const lastName = random.pick(names.last);

    const emailKey = `${emailPart(firstName)}.${emailPart(lastName)}`;
    const seen = emailCounts.get(emailKey) ?? 0;
    emailCounts.set(emailKey, seen + 1);
    const email = `${emailKey}${seen === 0 ? "" : seen + 1}@example.com`;

    // When: hire date, and termination for leavers
    const terminated = random.chance(TERMINATION_RATE);
    const tenureDays = terminated
      ? random.int(MIN_TENURE_FOR_TERMINATION_DAYS, MAX_TENURE_DAYS)
      : Math.max(1, Math.floor(MAX_TENURE_DAYS * random.next() ** TENURE_SKEW));
    const hireDate = addDays(referenceDate, -tenureDays);
    const terminationDate = terminated
      ? addDays(hireDate, random.int(MIN_DAYS_BEFORE_TERMINATION, tenureDays - 1))
      : null;
    const endDate = terminationDate ?? referenceDate;
    const spanDays = Math.round((endDate.getTime() - hireDate.getTime()) / DAY_MS);

    // Current pay: model × natural spread, occasionally pushed far off as a planted outlier
    let base =
      modelBasePay(countryCode, jobTitle, level) * random.float(1 - PAY_SPREAD, 1 + PAY_SPREAD);
    if (!terminated && random.chance(OUTLIER_RATE)) {
      if (random.chance(0.5)) {
        base *= random.float(0.6, 0.75);
        plantedOutliers.underpaid.push(employeeCode);
      } else {
        base *= random.float(1.3, 1.5);
        plantedOutliers.overpaid.push(employeeCode);
      }
    }
    let currentBase = roundPay(base, currency);
    let currentBonus = roundPay(currentBase * bonusRate(jobTitle, level), currency);
    const currentBaseSalary = currentBase;
    const currentTargetBonus = currentBonus;

    // History, built backwards from current pay so the latest entry always equals it
    const changeCount = random.int(0, Math.min(MAX_PAY_CHANGES, Math.floor(spanDays / 365)));
    const offsets = distinctOffsets(random, changeCount, spanDays);
    const entries: GeneratedEntry[] = [];
    let entryLevel = level;
    for (let k = changeCount - 1; k >= 0; k--) {
      const canPromote = entryLevel > levelRange(jobTitle)[0];
      const reason: CompensationReason =
        canPromote && random.chance(PROMOTION_CHANCE)
          ? "PROMOTION"
          : random.chance(MARKET_ADJUSTMENT_CHANCE)
            ? "MARKET_ADJUSTMENT"
            : "MERIT";
      entries.unshift({
        effectiveDate: addDays(hireDate, offsets[k]!),
        baseSalary: currentBase,
        targetBonus: currentBonus,
        currency,
        reason,
      });
      const increase =
        reason === "PROMOTION"
          ? random.float(1.1, 1.15)
          : reason === "MERIT"
            ? random.float(1.02, 1.08)
            : random.float(1.03, 1.1);
      if (reason === "PROMOTION") entryLevel -= 1;
      currentBase = roundPay(currentBase / increase, currency);
      currentBonus = roundPay(currentBase * bonusRate(jobTitle, entryLevel), currency);
    }
    entries.unshift({
      effectiveDate: hireDate,
      baseSalary: currentBase,
      targetBonus: currentBonus,
      currency,
      reason: "HIRE",
    });

    employees.push({
      employeeCode,
      firstName,
      lastName,
      email,
      countryCode,
      department,
      jobTitle,
      level,
      hireDate,
      status: terminated ? "TERMINATED" : "ACTIVE",
      terminationDate,
      currentBaseSalary,
      currentTargetBonus,
      currentCurrency: currency,
      entries,
    });
  }

  return { employees, plantedOutliers };
}
