import { describe, expect, it } from "vitest";
import { backLinkState, resolveBackLink } from "./back-link";

describe("resolveBackLink", () => {
  it("returns where the user came from", () => {
    const state = backLinkState("/insights?tab=outliers&low=0.9", "Back to outliers");
    expect(resolveBackLink(state)).toEqual(state);
  });

  it("falls back to the employee list when opened directly", () => {
    expect(resolveBackLink(null)).toEqual({ backTo: "/employees", backLabel: "Back to employees" });
  });

  it("ignores anything that is not an in-app path", () => {
    expect(resolveBackLink({ backTo: "https://example.com", backLabel: "Away" }).backTo).toBe(
      "/employees",
    );
  });
});
