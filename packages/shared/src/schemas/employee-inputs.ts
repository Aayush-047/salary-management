import { z } from "zod";
import { LEVELS } from "../constants.js";

/*
 * Input schemas for creating and changing employees. They hold the rules that depend only on
 * the input itself; rules that need the database (date order, promotion direction, terminated
 * employees) live in the API's service layer.
 */

/**
 * Largest amount we accept, in whole units of local currency. The database stores pay as a
 * 32-bit integer; this keeps well clear of its limit (~2.1 billion) so bad input gets a 400,
 * not a database error. Real salaries, even in JPY or INR, are far below it.
 */
export const MAX_PAY_AMOUNT = 1_000_000_000;

/*
 * Messages are written for the HR user: the web forms show them next to the field, and the
 * API returns the same text in its 400 details.
 */

/** A calendar date as YYYY-MM-DD that actually exists (no 2026-02-30). */
export const IsoDateSchema = z
  .string({ error: "Enter a date" })
  // abort: a malformed value gets only this message, not also "not a valid calendar date".
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter a date as YYYY-MM-DD", abort: true })
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Not a valid calendar date");

const TOO_LARGE = "That amount is too large";
const BaseSalarySchema = z
  .number({ error: "Enter an amount" })
  .int("Use whole amounts")
  .positive("Must be more than 0")
  .max(MAX_PAY_AMOUNT, TOO_LARGE);
const TargetBonusSchema = z
  .number({ error: "Enter an amount (0 if none)" })
  .int("Use whole amounts")
  .min(0, "Can't be negative")
  .max(MAX_PAY_AMOUNT, TOO_LARGE);
const LEVEL_MESSAGE = `Choose a level from L${LEVELS[0]} to L${LEVELS[LEVELS.length - 1]}`;
const LevelSchema = z
  .number({ error: "Choose a level" })
  .int(LEVEL_MESSAGE)
  .min(LEVELS[0], LEVEL_MESSAGE)
  .max(LEVELS[LEVELS.length - 1]!, LEVEL_MESSAGE);
const NameSchema = z
  .string({ error: "Required" })
  .trim()
  .min(1, "Required")
  .max(100, "Keep it under 100 characters");
const EmailSchema = z
  .string({ error: "Required" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }))
  .pipe(z.string().max(200, "Keep it under 200 characters"));
const JobTitleSchema = z
  .string({ error: "Choose a job title" })
  .trim()
  .min(1, "Choose a job title")
  .max(100);
const CountryCodeSchema = z
  .string({ error: "Choose a country" })
  .trim()
  .toUpperCase()
  .length(2, "Choose a country");

/** Why a change was made; stored in the audit log. */
const NoteSchema = z
  .string({ error: "Please give a short reason" })
  .trim()
  .min(3, "Please give a short reason")
  .max(500, "Keep it under 500 characters");
const OptionalNoteSchema = z.string().trim().max(500, "Keep it under 500 characters").optional();

/** Reasons a user may pick for a pay change. HIRE is set by creation; RELOCATION by relocate. */
export const PAY_CHANGE_REASONS = ["MERIT", "PROMOTION", "MARKET_ADJUSTMENT", "OTHER"] as const;
export type PayChangeReason = (typeof PAY_CHANGE_REASONS)[number];

/** New employee; their starting pay becomes the HIRE compensation entry. */
export const CreateEmployeeSchema = z.object({
  firstName: NameSchema,
  lastName: NameSchema,
  email: EmailSchema,
  countryCode: CountryCodeSchema,
  jobTitle: JobTitleSchema,
  level: LevelSchema,
  hireDate: IsoDateSchema,
  baseSalary: BaseSalarySchema,
  targetBonus: TargetBonusSchema,
  note: OptionalNoteSchema,
});
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;

/** Profile edit: any subset of fields, plus a required reason. Country changes use relocation. */
export const UpdateEmployeeSchema = z
  .object({
    firstName: NameSchema.optional(),
    lastName: NameSchema.optional(),
    email: EmailSchema.optional(),
    jobTitle: JobTitleSchema.optional(),
    level: LevelSchema.optional(),
    hireDate: IsoDateSchema.optional(),
    note: NoteSchema,
  })
  .refine(
    (input) => Object.entries(input).some(([key, value]) => key !== "note" && value !== undefined),
    { message: "Change at least one field" },
  );
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;

/** A new pay entry. A promotion may also change level and/or job title in the same event. */
export const ChangePaySchema = z
  .object({
    effectiveDate: IsoDateSchema,
    baseSalary: BaseSalarySchema,
    targetBonus: TargetBonusSchema,
    reason: z.enum(PAY_CHANGE_REASONS),
    newLevel: LevelSchema.optional(),
    newJobTitle: JobTitleSchema.optional(),
    note: OptionalNoteSchema,
  })
  .refine(
    (input) =>
      input.reason === "PROMOTION" ||
      (input.newLevel === undefined && input.newJobTitle === undefined),
    { message: "Level and job title can only change with a promotion", path: ["reason"] },
  )
  .refine(
    (input) =>
      input.reason !== "PROMOTION" ||
      input.newLevel !== undefined ||
      input.newJobTitle !== undefined,
    { message: "A promotion needs a new level or job title", path: ["newLevel"] },
  );
export type ChangePayInput = z.infer<typeof ChangePaySchema>;

/** Fixing a mistake in an existing pay entry: any subset of fields, plus a required reason. */
export const CorrectCompensationSchema = z
  .object({
    effectiveDate: IsoDateSchema.optional(),
    baseSalary: BaseSalarySchema.optional(),
    targetBonus: TargetBonusSchema.optional(),
    note: NoteSchema,
  })
  .refine(
    (input) =>
      input.effectiveDate !== undefined ||
      input.baseSalary !== undefined ||
      input.targetBonus !== undefined,
    { message: "Change at least one field" },
  );
export type CorrectCompensationInput = z.infer<typeof CorrectCompensationSchema>;

/** Move to another country: new pay in the new country's currency, recorded as one event. */
export const RelocateSchema = z.object({
  countryCode: CountryCodeSchema,
  effectiveDate: IsoDateSchema,
  baseSalary: BaseSalarySchema,
  targetBonus: TargetBonusSchema,
  note: NoteSchema,
});
export type RelocateInput = z.infer<typeof RelocateSchema>;

export const TerminateSchema = z.object({
  terminationDate: IsoDateSchema,
  note: NoteSchema,
});
export type TerminateInput = z.infer<typeof TerminateSchema>;
