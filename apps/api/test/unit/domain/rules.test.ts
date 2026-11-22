import { describe, expect, it } from "vitest";
import { DomainError } from "../../../src/domain/errors.js";
import {
  checkHireDateChange,
  checkPayEntryDate,
  checkPromotion,
  checkTerminationDate,
} from "../../../src/domain/rules.js";

const TODAY = "2026-11-01";

/** Runs a rule and returns the DomainError code it throws, or "ok". */
function outcome(rule: () => void): string {
  try {
    rule();
    return "ok";
  } catch (error) {
    if (error instanceof DomainError) return error.code;
    throw error;
  }
}

describe("checkPayEntryDate", () => {
  const employment = { hireDate: "2022-03-01", terminationDate: null, today: TODAY };

  it.each([
    { effectiveDate: "2022-03-01", expected: "ok" },
    { effectiveDate: TODAY, expected: "ok" },
    { effectiveDate: "2026-11-02", expected: "FUTURE_DATE" },
    { effectiveDate: "2022-02-28", expected: "BEFORE_HIRE_DATE" },
  ])("$effectiveDate → $expected", ({ effectiveDate, expected }) => {
    expect(outcome(() => checkPayEntryDate({ ...employment, effectiveDate }))).toBe(expected);
  });

  it("rejects a date after termination", () => {
    const leaver = { ...employment, terminationDate: "2025-06-30" };

    expect(outcome(() => checkPayEntryDate({ ...leaver, effectiveDate: "2025-07-01" }))).toBe(
      "AFTER_TERMINATION_DATE",
    );
    expect(outcome(() => checkPayEntryDate({ ...leaver, effectiveDate: "2025-06-30" }))).toBe("ok");
  });

  it("explains the problem in plain words", () => {
    expect(() => checkPayEntryDate({ ...employment, effectiveDate: "2027-01-01" })).toThrow(
      "Effective date 2027-01-01 is in the future",
    );
  });
});

describe("checkPromotion", () => {
  const current = { currentLevel: 3, currentJobTitle: "Software Engineer" };

  it.each([
    { name: "a level increase", newLevel: 4, newJobTitle: undefined, expected: "ok" },
    {
      name: "a title change",
      newLevel: undefined,
      newJobTitle: "Engineering Manager",
      expected: "ok",
    },
    {
      name: "a lower level",
      newLevel: 2,
      newJobTitle: undefined,
      expected: "PROMOTION_LOWERS_LEVEL",
    },
    {
      name: "the same level and title",
      newLevel: 3,
      newJobTitle: "Software Engineer",
      expected: "PROMOTION_WITHOUT_CHANGE",
    },
    {
      name: "nothing",
      newLevel: undefined,
      newJobTitle: undefined,
      expected: "PROMOTION_WITHOUT_CHANGE",
    },
  ])("$name → $expected", ({ newLevel, newJobTitle, expected }) => {
    expect(outcome(() => checkPromotion({ ...current, newLevel, newJobTitle }))).toBe(expected);
  });
});

describe("checkTerminationDate", () => {
  const base = { latestEntryDate: "2025-04-01", today: TODAY };

  it.each([
    { terminationDate: "2025-04-01", expected: "ok" },
    { terminationDate: TODAY, expected: "ok" },
    { terminationDate: "2026-11-02", expected: "FUTURE_DATE" },
    { terminationDate: "2025-03-31", expected: "BEFORE_LATEST_PAY_CHANGE" },
  ])("$terminationDate → $expected", ({ terminationDate, expected }) => {
    expect(outcome(() => checkTerminationDate({ ...base, terminationDate }))).toBe(expected);
  });
});

describe("checkHireDateChange", () => {
  const base = { firstChangeDate: "2023-04-01", terminationDate: null, today: TODAY };

  it.each([
    { newHireDate: "2022-01-10", expected: "ok" },
    { newHireDate: "2023-04-01", expected: "HIRE_AFTER_PAY_CHANGE" },
    { newHireDate: "2026-12-01", expected: "FUTURE_DATE" },
  ])("$newHireDate → $expected", ({ newHireDate, expected }) => {
    expect(outcome(() => checkHireDateChange({ ...base, newHireDate }))).toBe(expected);
  });

  it("allows any past date when there are no later pay changes", () => {
    expect(
      outcome(() =>
        checkHireDateChange({ ...base, firstChangeDate: null, newHireDate: "2026-10-31" }),
      ),
    ).toBe("ok");
  });

  it("rejects a hire date after the termination date", () => {
    const leaver = { ...base, firstChangeDate: null, terminationDate: "2024-01-31" };
    expect(outcome(() => checkHireDateChange({ ...leaver, newHireDate: "2024-02-01" }))).toBe(
      "HIRE_AFTER_TERMINATION",
    );
  });
});
