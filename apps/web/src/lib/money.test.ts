import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it.each([
    { amount: 70_000, currency: "EUR", expected: "€70,000" },
    { amount: 140_000, currency: "USD", expected: "$140,000" },
    { amount: 8_500_000, currency: "JPY", expected: "¥8,500,000" },
    { amount: 75_000, currency: "GBP", expected: "£75,000" },
    { amount: 2_200_000, currency: "INR", expected: "₹2,200,000" },
    { amount: 110_000, currency: "SGD", expected: "SGD 110,000" },
  ])("formats $amount $currency as $expected", ({ amount, currency, expected }) => {
    expect(formatMoney(amount, currency).replace(/[\u00a0\u202f]/g, " ")).toBe(expected);
  });
});
