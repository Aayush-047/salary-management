import { ApiError } from "../../api/client";

export type FieldErrors = Record<string, string>;

/** Key for problems that belong to the whole form rather than one field. */
export const FORM_ERROR = "_form";

type Issue = { path: string | PropertyKey[]; message: string };

/**
 * Turns validation issues into one message per field (the first one wins). Works for zod
 * issues on the client (path as an array) and the API's 400 details (path as "a.b").
 */
export function issuesToFieldErrors(issues: readonly Issue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const path = Array.isArray(issue.path) ? issue.path.map(String).join(".") : issue.path;
    const key = path === "" ? FORM_ERROR : path;
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Field errors for any failure: validation details per field, everything else form-level. */
export function errorsFromFailure(error: unknown): FieldErrors {
  if (
    error instanceof ApiError &&
    error.code === "VALIDATION_ERROR" &&
    Array.isArray(error.details)
  ) {
    return issuesToFieldErrors(error.details as Issue[]);
  }
  if (error instanceof Error) return { [FORM_ERROR]: error.message };
  return { [FORM_ERROR]: "Something went wrong" };
}

/** Only the fields whose value differs from the original, for edits that send changes only. */
export function changedFields<T extends Record<string, unknown>>(
  original: T,
  edited: T,
): Partial<T> {
  const changes: Partial<T> = {};
  for (const key of Object.keys(edited) as (keyof T)[]) {
    if (edited[key] !== original[key]) changes[key] = edited[key];
  }
  return changes;
}

/** Today in the browser's calendar, as YYYY-MM-DD (the default for date fields). */
export function todayIso(now: Date = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** Mantine NumberInput yields a number, or a string while the field is empty or mid-edit. */
export function toAmount(value: number | string): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
