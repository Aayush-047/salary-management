import { describe, expect, it } from "vitest";
import { toTimeline } from "../../src/services/employee-detail-service.js";

const entry = (id: number, date: string, baseSalary: number, currency = "EUR") => ({
  id,
  employeeId: 1,
  effectiveDate: new Date(`${date}T00:00:00Z`),
  baseSalary,
  targetBonus: baseSalary / 10,
  currency,
  reason: "MERIT" as const,
  note: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

describe("toTimeline", () => {
  it("lists newest first with the change versus the previous entry", () => {
    const timeline = toTimeline([
      entry(1, "2022-03-01", 70_000),
      entry(2, "2023-04-01", 73_500),
      entry(3, "2024-04-01", 80_850),
    ]);

    expect(timeline.map((e) => [e.effectiveDate, e.baseChangePct])).toEqual([
      ["2024-04-01", 0.1],
      ["2023-04-01", 0.05],
      ["2022-03-01", null],
    ]);
    expect(timeline[0]).toMatchObject({ totalCash: 88_935, currency: "EUR" });
  });

  it("shows no % change across a currency change (relocation)", () => {
    const timeline = toTimeline([
      entry(1, "2022-03-01", 70_000),
      entry(2, "2024-06-01", 62_000, "GBP"),
    ]);

    expect(timeline[0]?.baseChangePct).toBeNull();
  });

  it("rounds the change to four decimal places", () => {
    const timeline = toTimeline([entry(1, "2022-03-01", 30_000), entry(2, "2023-03-01", 31_000)]);

    expect(timeline[0]?.baseChangePct).toBe(0.0333);
  });
});
