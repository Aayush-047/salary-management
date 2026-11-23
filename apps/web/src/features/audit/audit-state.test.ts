import { describe, expect, it } from "vitest";
import { stateParams } from "../insights/tab-state";
import { DEFAULT_AUDIT, parseAuditLog } from "./audit-state";

describe("audit log URL state", () => {
  it("defaults to everything, first page", () => {
    expect(parseAuditLog(new URLSearchParams())).toEqual(DEFAULT_AUDIT);
  });

  it("round-trips filters and drops invalid ones", () => {
    const state = {
      ...DEFAULT_AUDIT,
      action: "TERMINATE" as const,
      search: "anna",
      from: "2026-01-01",
      page: 2,
    };
    expect(parseAuditLog(stateParams(state, DEFAULT_AUDIT))).toEqual(state);
    expect(parseAuditLog(new URLSearchParams("action=DELETE&search=ben"))).toEqual({
      ...DEFAULT_AUDIT,
      search: "ben",
    });
  });
});
