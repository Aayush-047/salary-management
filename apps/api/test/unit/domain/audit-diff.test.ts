import { describe, expect, it } from "vitest";
import { diffFields } from "../../../src/domain/audit-diff.js";

const FIELDS = ["firstName", "level", "hireDate", "terminationDate"] as const;

describe("diffFields", () => {
  it("lists only the fields that changed, in the given order", () => {
    const before = { firstName: "Anna", level: 3, hireDate: new Date("2022-03-01") };
    const after = { level: 4, firstName: "Anna" };

    expect(diffFields(before, after, FIELDS)).toEqual([{ field: "level", from: 3, to: 4 }]);
  });

  it("ignores fields not present in the change", () => {
    expect(diffFields({ firstName: "Anna", level: 3 }, {}, FIELDS)).toEqual([]);
  });

  it("compares and records dates as YYYY-MM-DD", () => {
    const before = { hireDate: new Date("2022-03-01T00:00:00Z") };

    expect(diffFields(before, { hireDate: new Date("2022-03-01T00:00:00Z") }, FIELDS)).toEqual([]);
    expect(diffFields(before, { hireDate: new Date("2022-02-15T00:00:00Z") }, FIELDS)).toEqual([
      { field: "hireDate", from: "2022-03-01", to: "2022-02-15" },
    ]);
  });

  it("records a value appearing from nothing as a change from null", () => {
    const after = { terminationDate: new Date("2025-06-30T00:00:00Z") };

    expect(diffFields({ terminationDate: null }, after, FIELDS)).toEqual([
      { field: "terminationDate", from: null, to: "2025-06-30" },
    ]);
  });
});
