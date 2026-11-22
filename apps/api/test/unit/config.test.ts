import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";

describe("loadConfig", () => {
  it("applies defaults when variables are missing", () => {
    expect(loadConfig({})).toEqual({ port: 3000, corsOrigin: "http://localhost:5173" });
  });

  it("reads provided values", () => {
    const config = loadConfig({ PORT: "4000", CORS_ORIGIN: "https://example.com" });

    expect(config).toEqual({ port: 4000, corsOrigin: "https://example.com" });
  });

  it("rejects a non-numeric PORT", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow(/PORT/);
  });

  it("rejects an invalid CORS_ORIGIN", () => {
    expect(() => loadConfig({ CORS_ORIGIN: "not a url" })).toThrow(/CORS_ORIGIN/);
  });
});
