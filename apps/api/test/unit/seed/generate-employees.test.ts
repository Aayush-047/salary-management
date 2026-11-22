import { beforeAll, describe, expect, it } from "vitest";
import {
  COUNTRY_WEIGHTS,
  DEPARTMENT_WEIGHTS,
  LEVEL_WEIGHTS,
  OUTLIER_RATE,
  TERMINATION_RATE,
  generateEmployees,
  type GenerationResult,
} from "../../../prisma/seed/generate-employees.js";
import { levelRange } from "../../../prisma/seed/pay-model.js";
import { COUNTRIES } from "../../../prisma/seed/reference-data.js";

const REFERENCE_DATE = new Date("2026-11-01");
const COUNT = 10_000;

let result: GenerationResult;

beforeAll(() => {
  result = generateEmployees({ seed: 42, count: COUNT, referenceDate: REFERENCE_DATE });
});

/** Share of employees per key, e.g. { US: 0.30, IN: 0.22, … }. */
function shares<K>(keyOf: (e: GenerationResult["employees"][number]) => K): Map<K, number> {
  const counts = new Map<K, number>();
  for (const employee of result.employees) {
    const key = keyOf(employee);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Map([...counts].map(([key, n]) => [key, n / result.employees.length]));
}

function expectSharesNear<K>(
  actual: Map<K, number>,
  weights: readonly (readonly [K, number])[],
  tolerance: number,
) {
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  for (const [key, weight] of weights) {
    expect(Math.abs((actual.get(key) ?? 0) - weight / total), String(key)).toBeLessThan(tolerance);
  }
}

describe("determinism", () => {
  it("returns identical output for the same seed", () => {
    const a = generateEmployees({ seed: 7, count: 200, referenceDate: REFERENCE_DATE });
    const b = generateEmployees({ seed: 7, count: 200, referenceDate: REFERENCE_DATE });
    expect(a).toEqual(b);
  });

  it("returns different output for a different seed", () => {
    const a = generateEmployees({ seed: 7, count: 200, referenceDate: REFERENCE_DATE });
    const b = generateEmployees({ seed: 8, count: 200, referenceDate: REFERENCE_DATE });
    expect(a).not.toEqual(b);
  });
});

describe("identity", () => {
  it("generates the requested number of employees with sequential codes", () => {
    expect(result.employees).toHaveLength(COUNT);
    expect(result.employees[0]?.employeeCode).toBe("E00001");
    expect(result.employees.at(-1)?.employeeCode).toBe("E10000");
  });

  it("gives every employee a unique, ASCII-only email", () => {
    const emails = result.employees.map((e) => e.email);
    expect(new Set(emails).size).toBe(COUNT);
    for (const email of emails) {
      expect(email).toMatch(/^[a-z]+\.[a-z]+\d*@example\.com$/);
    }
  });
});

describe("every employee satisfies the database rules", () => {
  it("has a valid level for their title, positive pay and consistent termination", () => {
    const currencyOf = new Map(COUNTRIES.map((c) => [c.code, c.currency]));
    for (const e of result.employees) {
      const [min, max] = levelRange(e.jobTitle);
      expect(e.level).toBeGreaterThanOrEqual(min);
      expect(e.level).toBeLessThanOrEqual(max);
      expect(e.currentBaseSalary).toBeGreaterThan(0);
      expect(e.currentTargetBonus).toBeGreaterThanOrEqual(0);
      expect(e.currentCurrency).toBe(currencyOf.get(e.countryCode));
      expect(e.hireDate.getTime()).toBeLessThan(REFERENCE_DATE.getTime());
      expect(e.status === "TERMINATED").toBe(e.terminationDate !== null);
      if (e.terminationDate) {
        expect(e.terminationDate.getTime()).toBeGreaterThan(e.hireDate.getTime());
        expect(e.terminationDate.getTime()).toBeLessThan(REFERENCE_DATE.getTime());
      }
    }
  });
});

describe("compensation history", () => {
  it("starts with the hire, has strictly increasing dates and ends at current pay", () => {
    for (const e of result.employees) {
      const [first, ...rest] = e.entries;
      const last = e.entries.at(-1)!;
      expect(first?.reason).toBe("HIRE");
      expect(first?.effectiveDate).toEqual(e.hireDate);
      expect(rest.every((entry) => entry.reason !== "HIRE")).toBe(true);
      expect(e.entries.length).toBeLessThanOrEqual(5);

      for (let i = 1; i < e.entries.length; i++) {
        expect(e.entries[i]!.effectiveDate.getTime()).toBeGreaterThan(
          e.entries[i - 1]!.effectiveDate.getTime(),
        );
      }
      const end = e.terminationDate ?? REFERENCE_DATE;
      expect(last.effectiveDate.getTime()).toBeLessThanOrEqual(end.getTime());

      expect(last.baseSalary).toBe(e.currentBaseSalary);
      expect(last.targetBonus).toBe(e.currentTargetBonus);
      expect(e.entries.every((entry) => entry.currency === e.currentCurrency)).toBe(true);
      expect(e.entries.every((entry) => entry.baseSalary > 0)).toBe(true);
    }
  });

  it("includes enough pay changes for a meaningful 'recent changes' view", () => {
    const changes = result.employees.reduce((sum, e) => sum + e.entries.length - 1, 0);
    expect(changes).toBeGreaterThan(COUNT); // more than one change per employee on average
  });
});

describe("workforce mix matches the configured weights (±2 percentage points)", () => {
  it("countries", () =>
    expectSharesNear(
      shares((e) => e.countryCode),
      COUNTRY_WEIGHTS,
      0.02,
    ));
  it("departments", () =>
    expectSharesNear(
      shares((e) => e.department),
      DEPARTMENT_WEIGHTS,
      0.02,
    ));
  it("levels", () =>
    expectSharesNear(
      shares((e) => e.level),
      LEVEL_WEIGHTS,
      0.02,
    ));
});

describe("leavers and planted outliers", () => {
  it(`terminates about ${TERMINATION_RATE * 100}% of employees`, () => {
    const terminated = result.employees.filter((e) => e.status === "TERMINATED").length;
    expect(Math.abs(terminated / COUNT - TERMINATION_RATE)).toBeLessThan(0.01);
  });

  it(`plants about ${OUTLIER_RATE * 100}% outliers, all active, split between under- and overpaid`, () => {
    const { underpaid, overpaid } = result.plantedOutliers;
    const active = result.employees.filter((e) => e.status === "ACTIVE");
    const activeCodes = new Set(active.map((e) => e.employeeCode));

    expect(
      Math.abs((underpaid.length + overpaid.length) / active.length - OUTLIER_RATE),
    ).toBeLessThan(0.005);
    expect(underpaid.length).toBeGreaterThan(0);
    expect(overpaid.length).toBeGreaterThan(0);
    expect([...underpaid, ...overpaid].every((code) => activeCodes.has(code))).toBe(true);
    expect(underpaid.some((code) => overpaid.includes(code))).toBe(false);
  });
});
