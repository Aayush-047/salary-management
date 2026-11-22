import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";

const DATABASE_URL = "postgresql://user:pass@localhost:5432/salary_dev";

describe("loadConfig", () => {
  it("applies defaults when optional variables are missing", () => {
    expect(loadConfig({ DATABASE_URL })).toEqual({
      port: 3000,
      corsOrigin: "http://localhost:5173",
      databaseUrl: DATABASE_URL,
    });
  });

  it("reads provided values", () => {
    const config = loadConfig({ PORT: "4000", CORS_ORIGIN: "https://example.com", DATABASE_URL });

    expect(config).toEqual({
      port: 4000,
      corsOrigin: "https://example.com",
      databaseUrl: DATABASE_URL,
    });
  });

  it("requires DATABASE_URL", () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it("rejects a non-numeric PORT", () => {
    expect(() => loadConfig({ PORT: "abc", DATABASE_URL })).toThrow(/PORT/);
  });

  it("rejects an invalid CORS_ORIGIN", () => {
    expect(() => loadConfig({ CORS_ORIGIN: "not a url", DATABASE_URL })).toThrow(/CORS_ORIGIN/);
  });
});
