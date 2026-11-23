import { describe, expect, it } from "vitest";
import {
  OUTLIER_DEFAULTS,
  OutlierQuerySchema,
  PayStatsQuerySchema,
  RecentChangesQuerySchema,
} from "../src/index.js";

describe("PayStatsQuerySchema", () => {
  it("defaults to total cash by country, active employees, local currency", () => {
    expect(PayStatsQuerySchema.parse({})).toEqual({
      groupBy: "country",
      metric: "total",
      currency: "LOCAL",
      status: "ACTIVE",
    });
  });

  it("accepts the same filters as the employee list", () => {
    expect(
      PayStatsQuerySchema.parse({
        country: ["de", "gb"],
        level: "5",
        groupBy: "jobTitle",
        currency: "eur",
      }),
    ).toMatchObject({ country: ["DE", "GB"], level: [5], groupBy: "jobTitle", currency: "EUR" });
  });

  it.each([
    { name: "an unknown grouping", input: { groupBy: "salary" } },
    { name: "an unknown metric", input: { metric: "equity" } },
    { name: "a malformed currency", input: { currency: "EURO" } },
  ])("rejects $name", ({ input }) => {
    expect(PayStatsQuerySchema.safeParse(input).success).toBe(false);
  });
});

describe("OutlierQuerySchema", () => {
  it("uses the shared outlier defaults and base pay", () => {
    expect(OutlierQuerySchema.parse({})).toEqual({
      ...OUTLIER_DEFAULTS,
      metric: "base",
      direction: "both",
      status: "ACTIVE",
      page: 1,
      pageSize: 50,
    });
  });

  it("keeps the band rules: low below 1, high above 1", () => {
    expect(OutlierQuerySchema.safeParse({ low: "1.1" }).success).toBe(false);
    expect(OutlierQuerySchema.safeParse({ high: "0.9" }).success).toBe(false);
    expect(OutlierQuerySchema.parse({ low: "0.9", high: "1.1", direction: "under" })).toMatchObject(
      {
        low: 0.9,
        high: 1.1,
        direction: "under",
      },
    );
  });
});

describe("RecentChangesQuerySchema", () => {
  it("leaves the period to the API when no dates are given", () => {
    expect(RecentChangesQuerySchema.parse({})).toEqual({ status: "ACTIVE" });
  });

  it("rejects a period that ends before it starts", () => {
    const result = RecentChangesQuerySchema.safeParse({ from: "2026-06-01", to: "2026-01-01" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "The start date must be on or before the end date",
    );
  });
});
