import { describe, expect, it } from "vitest";
import { AuditLogQuerySchema } from "../src/index.js";

describe("AuditLogQuerySchema", () => {
  it("defaults to the first page of 50, everything included", () => {
    expect(AuditLogQuerySchema.parse({})).toEqual({ page: 1, pageSize: 50 });
  });

  it("accepts a period, an action and a search", () => {
    expect(
      AuditLogQuerySchema.parse({
        from: "2026-01-01",
        to: "2026-03-31",
        action: "TERMINATE",
        search: " anna ",
      }),
    ).toMatchObject({ from: "2026-01-01", to: "2026-03-31", action: "TERMINATE", search: "anna" });
  });

  it.each([
    { name: "an unknown action", input: { action: "DELETE" } },
    { name: "a period ending before it starts", input: { from: "2026-03-01", to: "2026-01-01" } },
    { name: "a page size above 100", input: { pageSize: "500" } },
  ])("rejects $name", ({ input }) => {
    expect(AuditLogQuerySchema.safeParse(input).success).toBe(false);
  });
});
