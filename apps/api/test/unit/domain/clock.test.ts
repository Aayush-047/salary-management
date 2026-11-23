import { describe, expect, it } from "vitest";
import { lastTwelveMonths, latestAllowedDate } from "../../../src/domain/clock.js";

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

describe("lastTwelveMonths", () => {
  it.each([
    { to: "2026-11-02", from: "2025-11-03" },
    { to: "2026-01-01", from: "2025-01-02" },
    { to: "2026-12-31", from: "2026-01-01" },
    { to: "2028-02-29", from: "2027-03-01" }, // leap day: the previous year has no 29 Feb
    { to: "2025-03-01", from: "2024-03-02" },
  ])("12 months ending $to start on $from", ({ to, from }) => {
    expect(lastTwelveMonths(to)).toEqual({ from, to });
  });
});
