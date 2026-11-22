import { useState } from "react";
import type { z } from "zod";
import { errorsFromFailure, issuesToFieldErrors, type FieldErrors } from "./form";

/**
 * Minimal form state for the action modals: values, per-field errors, and validation with the
 * same shared zod schema the API uses, so the user sees the API's rules before submitting.
 */
export function useActionForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});

  function set<K extends keyof T>(key: K, value: T[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    // Editing a field clears its error and any form-level error.
    setErrors((e) => {
      const next = { ...e };
      delete next[key as string];
      delete next._form;
      return next;
    });
  }

  /** Parses the payload with the schema; on failure shows the issues and returns undefined. */
  function validate<S extends z.ZodType>(schema: S, payload: unknown): z.infer<S> | undefined {
    const result = schema.safeParse(payload);
    if (result.success) return result.data;
    setErrors(issuesToFieldErrors(result.error.issues));
    return undefined;
  }

  function fail(error: unknown) {
    setErrors(errorsFromFailure(error));
  }

  return { values, set, errors, validate, fail };
}
