import { describe, expect, it } from "vitest";
import {
  auditHeadline,
  fieldLabel,
  formatAuditValue,
  formatChangePct,
  reasonLabel,
} from "./format";

describe("formatChangePct", () => {
  it.each([
    { pct: 0.0566, expected: "+5.7%" },
    { pct: -0.03, expected: "−3.0%" },
    { pct: 0, expected: "0.0%" },
    { pct: null, expected: null },
  ])("$pct → $expected", ({ pct, expected }) => {
    expect(formatChangePct(pct)).toBe(expected);
  });
});

describe("formatAuditValue", () => {
  it.each([
    { field: "baseSalary", value: 53_000, expected: "53,000" },
    { field: "level", value: 3, expected: "L3" },
    { field: "payReason", value: "MARKET_ADJUSTMENT", expected: "Market adjustment" },
    { field: "terminationDate", value: null, expected: "—" },
    { field: "country", value: "GB", expected: "GB" },
  ])("$field $value → $expected", ({ field, value, expected }) => {
    expect(formatAuditValue(field, value)).toBe(expected);
  });
});

describe("labels", () => {
  it("names fields and reasons in plain words, falling back to the raw name", () => {
    expect(fieldLabel("targetBonus")).toBe("Target bonus");
    expect(fieldLabel("somethingNew")).toBe("somethingNew");
    expect(reasonLabel("RELOCATION")).toBe("Relocation");
  });
});

describe("auditHeadline", () => {
  const change = (field: string, to: unknown = "x") => ({ field, from: null, to });

  it.each([
    {
      entry: { action: "CREATE", entityType: "EMPLOYEE", changes: [change("firstName")] },
      expected: "Employee created",
    },
    {
      entry: { action: "UPDATE", entityType: "EMPLOYEE", changes: [change("level")] },
      expected: "Profile updated",
    },
    {
      entry: { action: "UPDATE", entityType: "EMPLOYEE", changes: [change("country")] },
      expected: "Relocated",
    },
    {
      entry: { action: "TERMINATE", entityType: "EMPLOYEE", changes: [change("status")] },
      expected: "Left the company",
    },
    {
      entry: {
        action: "CREATE",
        entityType: "COMPENSATION_ENTRY",
        changes: [change("payReason", "PROMOTION")],
      },
      expected: "Promoted",
    },
    {
      entry: {
        action: "CREATE",
        entityType: "COMPENSATION_ENTRY",
        changes: [change("payReason", "MERIT")],
      },
      expected: "Pay changed",
    },
    {
      entry: {
        action: "UPDATE",
        entityType: "COMPENSATION_ENTRY",
        changes: [change("baseSalary")],
      },
      expected: "Pay entry corrected",
    },
  ] as const)("$expected", ({ entry, expected }) => {
    expect(auditHeadline(entry)).toBe(expected);
  });
});
