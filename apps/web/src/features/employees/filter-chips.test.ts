import { describe, expect, it } from "vitest";
import { availableJobTitles, filterChips } from "./filter-chips";
import { DEFAULT_QUERY } from "./url-state";

const META = {
  countries: [
    { code: "DE", name: "Germany", currency: "EUR" },
    { code: "GB", name: "United Kingdom", currency: "GBP" },
  ],
};

describe("filterChips", () => {
  it("shows nothing for the default view", () => {
    expect(filterChips(DEFAULT_QUERY, META)).toEqual([]);
  });

  it("creates one chip per value with readable labels", () => {
    const query = {
      ...DEFAULT_QUERY,
      status: "ALL" as const,
      country: ["DE", "GB"],
      department: ["Engineering"],
      jobTitle: ["Software Engineer"],
      level: [5],
    };

    expect(filterChips(query, META).map((c) => c.label)).toEqual([
      "Status: All",
      "Country: Germany",
      "Country: United Kingdom",
      "Department: Engineering",
      "Job title: Software Engineer",
      "Level: L5",
    ]);
  });

  it("removes only the chip's own value", () => {
    const query = { ...DEFAULT_QUERY, country: ["DE", "GB"], level: [4, 5] };
    const chips = filterChips(query, META);

    expect(chips.find((c) => c.key === "country:DE")?.remove).toEqual({ country: ["GB"] });
    expect(chips.find((c) => c.key === "level:5")?.remove).toEqual({ level: [4] });
  });

  it("resets a non-default status back to the default", () => {
    const chips = filterChips({ ...DEFAULT_QUERY, status: "TERMINATED" }, META);

    expect(chips).toEqual([
      { key: "status", label: "Status: Terminated", remove: { status: "ACTIVE" } },
    ]);
  });

  it("falls back to the country code before metadata has loaded", () => {
    expect(filterChips({ ...DEFAULT_QUERY, country: ["DE"] }, undefined)[0]?.label).toBe(
      "Country: DE",
    );
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
