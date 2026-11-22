import { describe, expect, it } from "vitest";
import { assertIsTestDatabaseUrl } from "../integration/safety.js";

describe("assertIsTestDatabaseUrl", () => {
  it("accepts a database whose name ends in _test", () => {
    const url = "postgresql://u:p@localhost:5432/salary_test";
    expect(assertIsTestDatabaseUrl(url)).toBe(url);
  });

  it.each([
    { name: "a dev database", url: "postgresql://u:p@localhost:5432/salary_dev" },
    { name: "a name that only contains _test", url: "postgresql://u:p@host/salary_test_backup" },
    { name: "no database name", url: "postgresql://u:p@localhost:5432" },
  ])("rejects $name", ({ url }) => {
    expect(() => assertIsTestDatabaseUrl(url)).toThrow(/must end in "_test"/);
  });

  it("rejects a missing URL", () => {
    expect(() => assertIsTestDatabaseUrl(undefined)).toThrow(/not set/);
  });

  it("rejects a malformed URL", () => {
    expect(() => assertIsTestDatabaseUrl("not a url")).toThrow(/not a valid URL/);
  });
});
