/**
 * Reference data: currencies, countries, departments, job titles and the single demo user.
 * Pure data, no I/O. FX rates are illustrative approximations, not official rates.
 */

export const FX_AS_OF = new Date("2026-11-01");

/** 1 unit of the currency = rateToUsd USD. */
export const FX_RATES = [
  { currency: "USD", rateToUsd: 1 },
  { currency: "GBP", rateToUsd: 1.33 },
  { currency: "EUR", rateToUsd: 1.16 },
  { currency: "SGD", rateToUsd: 0.77 },
  { currency: "BRL", rateToUsd: 0.186 },
  { currency: "INR", rateToUsd: 0.0113 },
  { currency: "JPY", rateToUsd: 0.0066 },
] as const;

export type CurrencyCode = (typeof FX_RATES)[number]["currency"];

export const COUNTRIES: readonly { code: string; name: string; currency: CurrencyCode }[] = [
  { code: "US", name: "United States", currency: "USD" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "SG", name: "Singapore", currency: "SGD" },
  { code: "BR", name: "Brazil", currency: "BRL" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "JP", name: "Japan", currency: "JPY" },
];

/** Department name → its job titles. Every job title belongs to exactly one department. */
export const DEPARTMENTS: Readonly<Record<string, readonly string[]>> = {
  Engineering: ["Software Engineer", "QA Engineer", "DevOps Engineer", "Engineering Manager"],
  Data: ["Data Analyst", "Data Scientist"],
  Product: ["Product Manager"],
  Design: ["Product Designer"],
  Sales: ["Account Executive", "Sales Development Representative"],
  Marketing: ["Marketing Specialist"],
  "Customer Support": ["Customer Support Specialist"],
  Finance: ["Financial Analyst"],
  People: ["HR Business Partner", "Recruiter"],
  Operations: ["Operations Analyst"],
};

/** The single demo user every change is attributed to until real auth exists. */
export const DEMO_USER_NAME = "HR Manager";
