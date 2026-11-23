import { OUTLIER_DEFAULTS } from "@salary/shared";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_OUTLIERS,
  DEFAULT_RECENT,
  clampBand,
  parseOutliers,
  parseRecent,
  stateParams,
} from "./tab-state";

describe("stateParams", () => {
  it("writes the tab first, then only non-default values", () => {
    const params = stateParams(
      { ...DEFAULT_OUTLIERS, low: 0.9, country: ["DE", "GB"], level: [] },
      DEFAULT_OUTLIERS,
      new URLSearchParams("tab=outliers&low=0.7"),
    );
    expect(params.toString()).toBe("tab=outliers&low=0.9&country=DE&country=GB");
  });
});

describe("outlier URL state", () => {
  it("defaults to the shared band and base pay", () => {
    expect(parseOutliers(new URLSearchParams())).toMatchObject({
      ...OUTLIER_DEFAULTS,
      metric: "base",
    });
  });

  it("round-trips through stateParams", () => {
    const state = {
      ...DEFAULT_OUTLIERS,
      low: 0.85,
      high: 1.3,
      minPeers: 8,
      direction: "under" as const,
      page: 2,
    };
    expect(parseOutliers(stateParams(state, DEFAULT_OUTLIERS))).toEqual(state);
  });

  it("drops an invalid band instead of failing", () => {
    expect(parseOutliers(new URLSearchParams("low=1.2&high=1.3")).low).toBe(OUTLIER_DEFAULTS.low);
  });
});

describe("recent changes URL state", () => {
  it("leaves the period to the API by default", () => {
    expect(parseRecent(new URLSearchParams())).toEqual(DEFAULT_RECENT);
  });

  it("keeps a chosen period", () => {
    expect(parseRecent(new URLSearchParams("from=2026-01-01&to=2026-06-30"))).toMatchObject({
      from: "2026-01-01",
      to: "2026-06-30",
    });
  });
});

describe("clampBand", () => {
  it.each([
    { band: [0.8, 1.2], expected: [0.8, 1.2] },
    { band: [1, 1.2], expected: [0.95, 1.2] },
    { band: [0.8, 1], expected: [0.8, 1.05] },
    { band: [0.7000000001, 1.3499999], expected: [0.7, 1.35] },
  ] as const)("$band → $expected", ({ band, expected }) => {
    expect(clampBand([...band])).toEqual(expected);
  });
});
