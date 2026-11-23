import { MAX_IMPORT_BYTES } from "@salary/shared";
import { describe, expect, it } from "vitest";
import { countriesSummary, employeesLabel, fileTooLarge } from "./import-format";

const country = (name: string, count: number) => ({ code: name.slice(0, 2), name, count });

describe("employeesLabel", () => {
  it.each([
    { count: 1, expected: "1 employee" },
    { count: 3, expected: "3 employees" },
    { count: 1240, expected: "1,240 employees" },
  ])("$count → $expected", ({ count, expected }) => {
    expect(employeesLabel(count)).toBe(expected);
  });
});

describe("countriesSummary", () => {
  it("joins countries in plain English", () => {
    expect(countriesSummary([])).toBe("");
    expect(countriesSummary([country("Germany", 410)])).toBe("410 in Germany");
    expect(
      countriesSummary([country("Germany", 410), country("India", 300), country("Japan", 1)]),
    ).toBe("410 in Germany, 300 in India and 1 in Japan");
  });
});

describe("fileTooLarge", () => {
  it("allows files up to the limit", () => {
    expect(fileTooLarge(MAX_IMPORT_BYTES)).toBe(false);
    expect(fileTooLarge(MAX_IMPORT_BYTES + 1)).toBe(true);
  });
});
