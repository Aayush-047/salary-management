import { describe, expect, it } from "vitest";
import { EmployeeListQuerySchema } from "../src/index.js";

describe("EmployeeListQuerySchema", () => {
  it("applies defaults: first page, active employees, sorted by name", () => {
    expect(EmployeeListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 25,
      status: "ACTIVE",
      sortBy: "name",
      sortDir: "asc",
    });
  });

  it("coerces query-string numbers", () => {
    expect(EmployeeListQuerySchema.parse({ page: "3", pageSize: "50" })).toMatchObject({
      page: 3,
      pageSize: 50,
    });
  });

  it("turns a single filter value into an array and keeps repeated values", () => {
    const parsed = EmployeeListQuerySchema.parse({ country: "de", level: ["3", "4"] });

    expect(parsed.country).toEqual(["DE"]);
    expect(parsed.level).toEqual([3, 4]);
  });

  it("trims search and treats a blank search as no search", () => {
    expect(EmployeeListQuerySchema.parse({ search: "  schmi " }).search).toBe("schmi");
    expect(EmployeeListQuerySchema.parse({ search: "   " }).search).toBeUndefined();
  });

  it.each([
    { name: "page 0", input: { page: "0" } },
    { name: "pageSize above 100", input: { pageSize: "500" } },
    { name: "level 9", input: { level: "9" } },
    { name: "a country name instead of a code", input: { country: "Germany" } },
    { name: "an unknown sort field", input: { sortBy: "password" } },
    { name: "an unknown status", input: { status: "GONE" } },
    { name: "an unknown sort direction", input: { sortDir: "sideways" } },
    { name: "a search over 100 characters", input: { search: "x".repeat(101) } },
  ])("rejects $name", ({ input }) => {
    expect(EmployeeListQuerySchema.safeParse(input).success).toBe(false);
  });
});
