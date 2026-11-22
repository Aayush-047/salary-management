import { describe, expect, it } from "vitest";
import {
  ChangePaySchema,
  CorrectCompensationSchema,
  CreateEmployeeSchema,
  IsoDateSchema,
  MAX_PAY_AMOUNT,
  RelocateSchema,
  TerminateSchema,
  UpdateEmployeeSchema,
} from "../src/index.js";

const VALID_EMPLOYEE = {
  firstName: "Anna",
  lastName: "Schmidt",
  email: "Anna.Schmidt@Example.com",
  countryCode: "de",
  jobTitle: "Software Engineer",
  level: 3,
  hireDate: "2024-03-01",
  baseSalary: 70_000,
  targetBonus: 7_000,
};

const VALID_PAY_CHANGE = {
  effectiveDate: "2025-04-01",
  baseSalary: 75_000,
  targetBonus: 7_500,
  reason: "MERIT",
};

describe("IsoDateSchema", () => {
  it("accepts a real calendar date", () => {
    expect(IsoDateSchema.parse("2024-02-29")).toBe("2024-02-29");
  });

  it.each(["2026-02-30", "2025-02-29", "2026-13-01", "26-01-01", "2026/01/01", "yesterday"])(
    "rejects %s",
    (value) => {
      expect(IsoDateSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("CreateEmployeeSchema", () => {
  it("accepts a valid employee and normalises email and country", () => {
    expect(CreateEmployeeSchema.parse(VALID_EMPLOYEE)).toMatchObject({
      email: "anna.schmidt@example.com",
      countryCode: "DE",
    });
  });

  it.each([
    { name: "a missing first name", change: { firstName: "  " } },
    { name: "an invalid email", change: { email: "anna@" } },
    { name: "level 7", change: { level: 7 } },
    { name: "zero base salary", change: { baseSalary: 0 } },
    { name: "a fractional salary", change: { baseSalary: 70_000.5 } },
    { name: "pay beyond the maximum", change: { baseSalary: MAX_PAY_AMOUNT + 1 } },
    { name: "a negative bonus", change: { targetBonus: -1 } },
    { name: "an impossible hire date", change: { hireDate: "2024-02-30" } },
    { name: "a country name instead of a code", change: { countryCode: "Germany" } },
  ])("rejects $name", ({ change }) => {
    expect(CreateEmployeeSchema.safeParse({ ...VALID_EMPLOYEE, ...change }).success).toBe(false);
  });
});

describe("UpdateEmployeeSchema", () => {
  it("accepts a partial change with a reason", () => {
    expect(UpdateEmployeeSchema.parse({ level: 4, note: "Level was entered wrongly" })).toEqual({
      level: 4,
      note: "Level was entered wrongly",
    });
  });

  it("requires a reason", () => {
    expect(UpdateEmployeeSchema.safeParse({ level: 4 }).success).toBe(false);
    expect(UpdateEmployeeSchema.safeParse({ level: 4, note: " " }).success).toBe(false);
  });

  it("requires at least one field besides the reason", () => {
    const result = UpdateEmployeeSchema.safeParse({ note: "Nothing to change" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Change at least one field");
  });

  it("does not allow changing the country (that is a relocation)", () => {
    const parsed = UpdateEmployeeSchema.parse({ countryCode: "GB", level: 4, note: "Typo fix" });
    expect(parsed).not.toHaveProperty("countryCode");
  });
});

describe("ChangePaySchema", () => {
  it("accepts a merit raise", () => {
    expect(ChangePaySchema.safeParse(VALID_PAY_CHANGE).success).toBe(true);
  });

  it("accepts a promotion with a new level", () => {
    const promotion = { ...VALID_PAY_CHANGE, reason: "PROMOTION", newLevel: 4 };
    expect(ChangePaySchema.safeParse(promotion).success).toBe(true);
  });

  it("requires a promotion to change level or title", () => {
    const result = ChangePaySchema.safeParse({ ...VALID_PAY_CHANGE, reason: "PROMOTION" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("A promotion needs a new level or job title");
  });

  it("only lets a promotion change level or title", () => {
    const result = ChangePaySchema.safeParse({ ...VALID_PAY_CHANGE, newLevel: 4 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Level and job title can only change with a promotion",
    );
  });

  it.each(["HIRE", "RELOCATION", "BONUS"])("rejects the reason %s", (reason) => {
    expect(ChangePaySchema.safeParse({ ...VALID_PAY_CHANGE, reason }).success).toBe(false);
  });
});

describe("CorrectCompensationSchema", () => {
  it("accepts a corrected amount with a reason", () => {
    const input = { baseSalary: 90_000, note: "Typed 900,000 instead of 90,000" };
    expect(CorrectCompensationSchema.parse(input)).toEqual(input);
  });

  it("requires a reason and at least one corrected field", () => {
    expect(CorrectCompensationSchema.safeParse({ baseSalary: 90_000 }).success).toBe(false);
    expect(CorrectCompensationSchema.safeParse({ note: "Nothing" }).success).toBe(false);
  });
});

describe("RelocateSchema / TerminateSchema", () => {
  it("accepts a relocation with new pay and a reason", () => {
    const input = {
      countryCode: "gb",
      effectiveDate: "2025-06-01",
      baseSalary: 62_000,
      targetBonus: 6_200,
      note: "Moved to the London office",
    };
    expect(RelocateSchema.parse(input).countryCode).toBe("GB");
  });

  it("requires a reason to terminate", () => {
    expect(TerminateSchema.safeParse({ terminationDate: "2025-06-30" }).success).toBe(false);
    expect(
      TerminateSchema.safeParse({ terminationDate: "2025-06-30", note: "Resigned" }).success,
    ).toBe(true);
  });
});
