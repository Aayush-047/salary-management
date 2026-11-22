import { describe, expect, it } from "vitest";
import { latestAllowedDate } from "../../../src/domain/clock.js";

const at = (iso: string) => () => new Date(iso);

describe("latestAllowedDate", () => {
  it("accepts the next UTC day once it has started somewhere (UTC+14)", () => {
    // 18:30 UTC on the 22nd is already 00:00 on the 23rd in India (UTC+5:30).
    expect(latestAllowedDate(at("2026-11-22T18:30:00Z"))).toBe("2026-11-23");
  });

  it("stays on the UTC day while no time zone has reached the next one", () => {
    expect(latestAllowedDate(at("2026-11-22T09:59:00Z"))).toBe("2026-11-22");
    expect(latestAllowedDate(at("2026-11-22T10:00:00Z"))).toBe("2026-11-23");
  });

  it("never allows two days ahead", () => {
    expect(latestAllowedDate(at("2026-11-22T23:59:59Z"))).toBe("2026-11-23");
  });
});
