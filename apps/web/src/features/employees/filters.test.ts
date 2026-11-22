import { describe, expect, it } from "vitest";
import { activeFilterCount, availableJobTitles } from "./filters";
import { DEFAULT_QUERY } from "./url-state";

describe("activeFilterCount", () => {
  it("is zero for the default view", () => {
    expect(activeFilterCount(DEFAULT_QUERY)).toBe(0);
  });

  it("counts every selected value plus a non-default status", () => {
    const query = {
      ...DEFAULT_QUERY,
      status: "ALL" as const,
      country: ["DE", "GB"],
      department: ["Engineering"],
      jobTitle: ["Software Engineer"],
      level: [4, 5],
    };

    expect(activeFilterCount(query)).toBe(7);
  });

  it("does not count search, sorting or paging", () => {
    const query = { ...DEFAULT_QUERY, search: "anna", sortBy: "hireDate" as const, page: 4 };

    expect(activeFilterCount(query)).toBe(0);
  });
});

describe("availableJobTitles", () => {
  const departments = [
    { name: "Engineering", jobTitles: ["Software Engineer", "QA Engineer"] },
    { name: "Data", jobTitles: ["Data Analyst"] },
  ];

  it("offers every title when no department is selected", () => {
    expect(availableJobTitles(departments, undefined)).toEqual([
      "Data Analyst",
      "QA Engineer",
      "Software Engineer",
    ]);
  });

  it("offers only titles from the selected departments", () => {
    expect(availableJobTitles(departments, ["Data"])).toEqual(["Data Analyst"]);
  });
});
