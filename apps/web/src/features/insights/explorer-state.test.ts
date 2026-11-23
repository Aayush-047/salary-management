import type { PayStatsRow } from "@salary/shared";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPLORER,
  explorerParams,
  orderLike,
  parseExplorer,
  toChartRows,
} from "./explorer-state";

const row = (key: string, label: string, median: number): PayStatsRow => ({
  key,
  label,
  median,
  headcount: 1,
  min: median,
  average: median,
  max: median,
  total: median,
  currency: "USD",
});

describe("explorer URL state", () => {
  it("defaults to total cash by country for active employees", () => {
    expect(parseExplorer(new URLSearchParams())).toEqual(DEFAULT_EXPLORER);
    expect(DEFAULT_EXPLORER).toMatchObject({
      groupBy: "country",
      metric: "total",
      status: "ACTIVE",
    });
  });

  it("round-trips grouping, metric and filters, and keeps the active tab", () => {
    const state = {
      ...DEFAULT_EXPLORER,
      groupBy: "level" as const,
      metric: "base" as const,
      country: ["DE", "GB"],
    };
    const params = explorerParams(state, new URLSearchParams("tab=explorer&groupBy=country"));

    expect(params.toString()).toBe("tab=explorer&groupBy=level&metric=base&country=DE&country=GB");
    expect(parseExplorer(params)).toEqual(state);
  });

  it("drops invalid parameters instead of failing", () => {
    expect(parseExplorer(new URLSearchParams("groupBy=salary&country=DE"))).toEqual({
      ...DEFAULT_EXPLORER,
      country: ["DE"],
    });
  });
});

describe("toChartRows", () => {
  it("ranks groups by median, largest first", () => {
    const rows = [
      row("DE", "Germany", 62_800),
      row("US", "United States", 114_800),
      row("IN", "India", 21_000),
    ];
    expect(toChartRows(rows, "country").map((r) => r.label)).toEqual([
      "United States",
      "Germany",
      "India",
    ]);
  });

  it("keeps levels in their natural order", () => {
    const rows = [row("3", "L3", 90_000), row("1", "L1", 50_000), row("6", "L6", 200_000)];
    expect(toChartRows(rows, "level").map((r) => r.label)).toEqual(["L1", "L3", "L6"]);
  });
});

describe("orderLike", () => {
  it("orders mixed-currency rows by the chart's single-currency ranking, not raw amounts", () => {
    const local = [
      { ...row("JP", "Japan", 7_640_000), currency: "JPY" },
      { ...row("DE", "Germany", 69_000), currency: "EUR" },
      { ...row("US", "United States", 125_750), currency: "USD" },
    ];
    const chartInUsd = toChartRows(
      [
        row("JP", "Japan", 50_424),
        row("DE", "Germany", 80_040),
        row("US", "United States", 125_750),
      ],
      "country",
    );

    expect(orderLike(local, chartInUsd).map((r) => r.key)).toEqual(["US", "DE", "JP"]);
  });
});
