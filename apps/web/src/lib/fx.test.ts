import { describe, expect, it } from "vitest";
import { convertAmount } from "./fx";

const RATES = { USD: 1, EUR: 1.16, GBP: 1.33, JPY: 0.0066 };

describe("convertAmount", () => {
  it("returns the same amount for the same currency", () => {
    expect(convertAmount(70_000, "EUR", "EUR", RATES)).toBe(70_000);
  });

  it("converts through USD", () => {
    expect(convertAmount(64_000, "EUR", "GBP", RATES)).toBeCloseTo(55_819.55, 2); // 64,000 × 1.16 / 1.33
    expect(convertAmount(10_000_000, "JPY", "USD", RATES)).toBeCloseTo(66_000, 6);
  });

  it("returns null when a rate is missing", () => {
    expect(convertAmount(100, "CHF", "USD", RATES)).toBeNull();
  });
});
