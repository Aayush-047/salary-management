import { describe, expect, it } from "vitest";
import { OUTLIER_DEFAULTS, OutlierParamsSchema } from "../src/index.js";

describe("OutlierParamsSchema", () => {
  it("applies the defaults when no parameters are given", () => {
    expect(OutlierParamsSchema.parse({})).toEqual(OUTLIER_DEFAULTS);
  });

  it("coerces query-string values to numbers", () => {
    expect(OutlierParamsSchema.parse({ low: "0.9", high: "1.1", minPeers: "8" })).toEqual({
      low: 0.9,
      high: 1.1,
      minPeers: 8,
    });
  });

  it.each([
    { name: "low of 0", input: { low: 0 } },
    { name: "low of 1 or more", input: { low: 1 } },
    { name: "high of 1 or less", input: { high: 1 } },
    { name: "high above 5", input: { high: 5.5 } },
    { name: "minPeers below 2", input: { minPeers: 1 } },
    { name: "non-integer minPeers", input: { minPeers: 4.5 } },
    { name: "non-numeric text", input: { low: "abc" } },
  ])("rejects $name", ({ input }) => {
    expect(OutlierParamsSchema.safeParse(input).success).toBe(false);
  });
});
