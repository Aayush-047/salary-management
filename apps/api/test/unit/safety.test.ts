import { describe, expect, it } from "vitest";
import { assertIsE2eDatabaseUrl, assertIsTestDatabaseUrl } from "../../src/db/safety.js";

describe("assertIsTestDatabaseUrl", () => {
  it("accepts a database whose name ends in _test", () => {
    const url = "postgresql://u:p@localhost:5432/salary_test";
    expect(assertIsTestDatabaseUrl(url)).toBe(url);
  });

  it.each([
    { name: "a dev database", url: "postgresql://u:p@localhost:5432/salary_dev" },
    { name: "a name that only contains _test", url: "postgresql://u:p@host/salary_test_backup" },
    { name: "no database name", url: "postgresql://u:p@localhost:5432" },
    { name: "the e2e database", url: "postgresql://u:p@localhost:5432/salary_e2e" },
  ])("rejects $name", ({ url }) => {
    expect(() => assertIsTestDatabaseUrl(url)).toThrow(/must end in "_test"/);
  });

  it("rejects a missing URL, naming the variable", () => {
    expect(() => assertIsTestDatabaseUrl(undefined)).toThrow(/TEST_DATABASE_URL is not set/);
  });

  it("rejects a malformed URL", () => {
    expect(() => assertIsTestDatabaseUrl("not a url")).toThrow(/not a valid URL/);
  });
});

describe("assertIsE2eDatabaseUrl", () => {
  it("accepts a database whose name ends in _e2e", () => {
    const url = "postgresql://u:p@localhost:5432/salary_e2e";
    expect(assertIsE2eDatabaseUrl(url)).toBe(url);
  });

  it.each([
    { name: "a dev database", url: "postgresql://u:p@localhost:5432/salary_dev" },
    { name: "the integration test database", url: "postgresql://u:p@localhost:5432/salary_test" },
  ])("rejects $name", ({ url }) => {
    expect(() => assertIsE2eDatabaseUrl(url)).toThrow(/must end in "_e2e"/);
  });

  it("rejects a missing URL, naming the variable", () => {
    expect(() => assertIsE2eDatabaseUrl(undefined)).toThrow(/E2E_DATABASE_URL is not set/);
  });
});
