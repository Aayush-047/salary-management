import { describe, expect, it } from "vitest";
import { ApiError } from "../../api/client";
import {
  FORM_ERROR,
  changedFields,
  errorsFromFailure,
  issuesToFieldErrors,
  toAmount,
  todayIso,
} from "./form";

describe("issuesToFieldErrors", () => {
  it("maps zod-style array paths and API-style string paths to field keys", () => {
    expect(
      issuesToFieldErrors([
        { path: ["baseSalary"], message: "Too small" },
        { path: "email", message: "Invalid email" },
        { path: ["level", 0], message: "Too big" },
      ]),
    ).toEqual({ baseSalary: "Too small", email: "Invalid email", "level.0": "Too big" });
  });

  it("keeps the first message per field and puts path-less issues on the form", () => {
    expect(
      issuesToFieldErrors([
        { path: ["note"], message: "Please give a short reason" },
        { path: ["note"], message: "Too long" },
        { path: [], message: "Change at least one field" },
      ]),
    ).toEqual({ note: "Please give a short reason", [FORM_ERROR]: "Change at least one field" });
  });
});

describe("errorsFromFailure", () => {
  it("spreads API validation details over the fields", () => {
    const error = new ApiError(400, "VALIDATION_ERROR", "Invalid request", [
      { path: "effectiveDate", message: "Use the format YYYY-MM-DD" },
    ]);
    expect(errorsFromFailure(error)).toEqual({ effectiveDate: "Use the format YYYY-MM-DD" });
  });

  it("shows business-rule errors on the form, in the API's own words", () => {
    const error = new ApiError(422, "FUTURE_DATE", "Effective date 2027-01-01 is in the future");
    expect(errorsFromFailure(error)).toEqual({
      [FORM_ERROR]: "Effective date 2027-01-01 is in the future",
    });
  });
});

describe("changedFields", () => {
  it("returns only the fields that differ", () => {
    const original = { firstName: "Ben", lastName: "Weber", level: 2 };
    expect(changedFields(original, { firstName: "Ben", lastName: "Webber", level: 3 })).toEqual({
      lastName: "Webber",
      level: 3,
    });
    expect(changedFields(original, { ...original })).toEqual({});
  });
});

describe("helpers", () => {
  it("formats today as YYYY-MM-DD", () => {
    expect(todayIso(new Date("2026-11-01T12:00:00Z"))).toMatch(/^2026-11-0[12]$/);
  });

  it("treats an empty or partial number field as no amount", () => {
    expect(toAmount(75_000)).toBe(75_000);
    expect(toAmount("")).toBeUndefined();
    expect(toAmount("-")).toBeUndefined();
  });
});
