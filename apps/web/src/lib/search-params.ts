import type { z } from "zod";

/** URLSearchParams → plain object; repeated keys become arrays. */
export function toRecord(params: URLSearchParams): Record<string, string | string[]> {
  const record: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    record[key] = values.length > 1 ? values : values[0]!;
  }
  return record;
}

/**
 * Parses URL parameters with a schema shared with the API. Invalid parameters (e.g. a
 * hand-edited `level=9`) are dropped one by one instead of breaking the page; if nothing
 * survives, the schema's defaults apply.
 */
export function parseSearchParams<S extends z.ZodType>(
  schema: S,
  params: URLSearchParams,
): z.infer<S> {
  const record = toRecord(params);
  for (let attempt = 0; attempt < 10; attempt++) {
    const result = schema.safeParse(record);
    if (result.success) return result.data;
    let removed = false;
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && key in record) {
        delete record[key];
        removed = true;
      }
    }
    if (!removed) break;
  }
  return schema.parse({});
}

/** Appends a value or list of values under one key (nothing for undefined / empty lists). */
export function appendParam(
  params: URLSearchParams,
  key: string,
  value: string | number | readonly (string | number)[] | undefined,
): void {
  if (value === undefined) return;
  for (const item of Array.isArray(value) ? value : [value]) params.append(key, String(item));
}

/**
 * The URL's parameters right now. Use this, not the values from the last render, when building
 * the next URL: two quick changes (e.g. "From" then "To") would otherwise each start from the
 * same stale parameters and the second would drop the first. react-router's functional
 * setSearchParams also hands over the render-time values, so it doesn't avoid this.
 */
export function latestSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}
