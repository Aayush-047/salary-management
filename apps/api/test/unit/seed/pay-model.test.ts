import { describe, expect, it } from "vitest";
import { NAMES } from "../../../prisma/seed/names.js";
import {
  COUNTRY_BASE,
  TITLE_FACTOR,
  bonusRate,
  levelRange,
  modelBasePay,
  roundPay,
} from "../../../prisma/seed/pay-model.js";
import { COUNTRIES, DEPARTMENTS } from "../../../prisma/seed/reference-data.js";

describe("pay model coverage", () => {
  it("has a base pay and names for every country", () => {
    for (const { code } of COUNTRIES) {
      expect(COUNTRY_BASE[code], code).toBeGreaterThan(0);
      expect(NAMES[code]?.first.length, code).toBeGreaterThan(0);
      expect(NAMES[code]?.last.length, code).toBeGreaterThan(0);
    }
  });

  it("has a pay factor for every job title", () => {
    for (const title of Object.values(DEPARTMENTS).flat()) {
      expect(TITLE_FACTOR[title], title).toBeGreaterThan(0);
    }
  });
});

describe("modelBasePay", () => {
  it("multiplies country base, title factor and level factor", () => {
    // US Product Manager at L5: 140,000 × 1.10 × 1.55
    expect(modelBasePay("US", "Product Manager", 5)).toBeCloseTo(238_700);
  });

  it("increases with level", () => {
    const byLevel = [1, 2, 3, 4, 5, 6].map((level) =>
      modelBasePay("DE", "Software Engineer", level),
    );
    expect(byLevel).toEqual([...byLevel].sort((a, b) => a - b));
  });

  it("rejects unknown inputs instead of returning NaN", () => {
    expect(() => modelBasePay("XX", "Software Engineer", 3)).toThrow(/country/);
    expect(() => modelBasePay("US", "Astronaut", 3)).toThrow(/title/);
    expect(() => modelBasePay("US", "Software Engineer", 7)).toThrow(/level/);
  });
});

describe("bonusRate", () => {
  it("rises with level", () => {
    expect(bonusRate("Software Engineer", 1)).toBe(0.05);
    expect(bonusRate("Software Engineer", 6)).toBe(0.2);
  });

  it("is doubled for sales titles", () => {
    expect(bonusRate("Account Executive", 3)).toBe(0.2);
  });
});

describe("levelRange", () => {
  it("restricts managers to senior levels and SDRs to junior levels", () => {
    expect(levelRange("Engineering Manager")).toEqual([4, 6]);
    expect(levelRange("Sales Development Representative")).toEqual([1, 3]);
    expect(levelRange("Software Engineer")).toEqual([1, 6]);
  });
});

describe("roundPay", () => {
  it.each([
    { amount: 123_456, currency: "USD", expected: 123_500 },
    { amount: 2_234_567, currency: "INR", expected: 2_235_000 },
    { amount: 8_512_345, currency: "JPY", expected: 8_510_000 },
    { amount: 10, currency: "USD", expected: 100 },
  ])("rounds $amount $currency to $expected", ({ amount, currency, expected }) => {
    expect(roundPay(amount, currency)).toBe(expected);
  });
});
