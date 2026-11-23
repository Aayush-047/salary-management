import { describe, expect, it } from "vitest";
import { displayAmount } from "./display-currency";

const RATES = { USD: 1, EUR: 1.16, JPY: 0.0066 };

describe("displayAmount", () => {
  it("keeps the original amount in LOCAL", () => {
    expect(displayAmount(70_000, "EUR", "LOCAL", RATES)).toEqual({
      amount: 70_000,
      currency: "EUR",
      converted: false,
    });
  });

  it("keeps the original when it is already in the chosen currency", () => {
    expect(displayAmount(70_000, "EUR", "EUR", RATES).converted).toBe(false);
  });

  it("converts and rounds to whole units otherwise", () => {
    expect(displayAmount(70_000, "EUR", "USD", RATES)).toEqual({
      amount: 81_200,
      currency: "USD",
      converted: true,
    });
    expect(displayAmount(10_000_000, "JPY", "EUR", RATES).amount).toBe(56_897);
  });

  it("falls back to the original if rates are missing or not loaded yet", () => {
    expect(displayAmount(1_000, "CHF", "USD", RATES)).toMatchObject({
      currency: "CHF",
      converted: false,
    });
    expect(displayAmount(1_000, "EUR", "USD", undefined)).toMatchObject({
      currency: "EUR",
      converted: false,
    });
  });
});
