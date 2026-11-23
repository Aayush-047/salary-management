import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUERY,
  applyChange,
  clearFilters,
  filterChange,
  hasActiveFilters,
  parseListQuery,
  toSearchParams,
  toggleSort,
} from "./url-state";

const parse = (search: string) => parseListQuery(new URLSearchParams(search));

describe("parseListQuery", () => {
  it("returns the defaults for an empty URL", () => {
    expect(parse("")).toEqual(DEFAULT_QUERY);
  });

  it("reads filters, repeated keys, sorting and paging", () => {
    expect(
      parse("country=DE&country=GB&level=5&search=schmi&sortBy=totalCash&sortDir=desc&page=2"),
    ).toEqual({
      ...DEFAULT_QUERY,
      country: ["DE", "GB"],
      level: [5],
      search: "schmi",
      sortBy: "totalCash",
      sortDir: "desc",
      page: 2,
    });
  });

  it("drops invalid parameters but keeps the valid ones", () => {
    expect(parse("level=9&country=DE&sortBy=password&page=-1")).toEqual({
      ...DEFAULT_QUERY,
      country: ["DE"],
    });
  });
});

describe("toSearchParams", () => {
  it("leaves defaults out so URLs stay short", () => {
    expect(toSearchParams(DEFAULT_QUERY).toString()).toBe("");
  });

  it("round-trips through parseListQuery", () => {
    const query = {
      ...DEFAULT_QUERY,
      country: ["DE", "GB"],
      level: [3, 4],
      department: ["Engineering"],
      status: "ALL" as const,
      sortBy: "baseSalary" as const,
      sortDir: "desc" as const,
      pageSize: 50,
      page: 4,
    };
    expect(parseListQuery(toSearchParams(query))).toEqual(query);
  });
});

describe("applyChange", () => {
  const onPage3 = { ...DEFAULT_QUERY, page: 3 };

  it("goes back to page 1 when a filter changes", () => {
    expect(applyChange(onPage3, { country: ["DE"] })).toMatchObject({ country: ["DE"], page: 1 });
  });

  it("keeps the requested page when only the page changes", () => {
    expect(applyChange(onPage3, { page: 4 }).page).toBe(4);
  });

  it("treats an emptied multi-select or blank search as no filter", () => {
    const filtered = { ...DEFAULT_QUERY, country: ["DE"], search: "anna" };
    const next = applyChange(filtered, { country: [], search: "" });

    expect(next).not.toHaveProperty("country");
    expect(next).not.toHaveProperty("search");
  });
});

describe("filterChange", () => {
  it("clears filters the modal no longer includes (e.g. after Reset)", () => {
    const current = {
      ...DEFAULT_QUERY,
      search: "tana",
      department: ["Engineering"],
      jobTitle: ["Software Engineer"],
      level: [4, 5],
      page: 3,
    };

    const next = applyChange(current, filterChange({ status: "ACTIVE", country: ["JP"] }));

    expect(next).toEqual({ ...DEFAULT_QUERY, search: "tana", country: ["JP"] });
  });
});

describe("clearFilters / hasActiveFilters", () => {
  it("clears search, filters and status but keeps sort and page size", () => {
    const query = {
      ...DEFAULT_QUERY,
      search: "anna",
      country: ["DE"],
      status: "ALL" as const,
      sortBy: "hireDate" as const,
      pageSize: 50,
      page: 5,
    };
    const cleared = clearFilters(query);

    expect(cleared).toEqual({ ...DEFAULT_QUERY, sortBy: "hireDate", pageSize: 50 });
    expect(hasActiveFilters(query)).toBe(true);
    expect(hasActiveFilters(cleared)).toBe(false);
  });
});

describe("toggleSort", () => {
  it("sorts a new column ascending", () => {
    expect(toggleSort({ sortBy: "name", sortDir: "asc" }, "totalCash")).toEqual({
      sortBy: "totalCash",
      sortDir: "asc",
    });
  });

  it("flips the direction of the current column", () => {
    expect(toggleSort({ sortBy: "totalCash", sortDir: "asc" }, "totalCash").sortDir).toBe("desc");
    expect(toggleSort({ sortBy: "totalCash", sortDir: "desc" }, "totalCash").sortDir).toBe("asc");
  });
});
