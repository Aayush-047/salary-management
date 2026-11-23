import {
  CreateEmployeeSchema,
  IMPORT_COLUMNS,
  MAX_IMPORT_ROWS,
  type CreateEmployeeInput,
  type ImportColumn,
  type ImportIssue,
} from "@salary/shared";
import type { InfoRecord } from "csv-parse";
import { CsvError, parse } from "csv-parse/sync";

/*
 * Reading and checking an employee CSV. Pure: no database access. Facts that need data
 * (which countries and titles exist, which emails are taken) are passed in by the caller.
 */

export type ParsedRow = { row: number; values: Record<ImportColumn, string> };
export type ReadResult = { rows: ParsedRow[]; issues: ImportIssue[] };

const COLUMN_NAMES = IMPORT_COLUMNS.map((c) => c.name);
const BY_LOWERCASE = new Map<string, ImportColumn>(COLUMN_NAMES.map((n) => [n.toLowerCase(), n]));

const fileIssue = (message: string, row: number | null = null): ImportIssue => ({
  row,
  column: null,
  message,
});

function describeCsvError(error: CsvError): string {
  if (error.code.includes("QUOTE")) {
    return "a quotation mark is misplaced; values with commas must be wrapped in quotes";
  }
  return error.message.replace(/^.*?:\s*/, "");
}

/**
 * Reads a CSV into rows keyed by the known column names. Rows are parsed as plain arrays and
 * only known column names ever become keys, so header text (e.g. "__proto__") can never reach
 * an object key. Problems with the whole file stop the read; row problems are collected.
 */
export function readEmployeeCsv(text: string): ReadResult {
  if (text.trim() === "") return { rows: [], issues: [fileIssue("The file is empty")] };

  let records: { record: string[]; info: InfoRecord }[];
  try {
    // With `info: true` each record comes with its line numbers; csv-parse's typings don't
    // model that option's return shape, so it is stated here once.
    records = parse(text, {
      bom: true,
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
      info: true,
    }) as unknown as { record: string[]; info: InfoRecord }[];
  } catch (error) {
    if (error instanceof CsvError) {
      return {
        rows: [],
        issues: [
          fileIssue(
            `The file couldn't be read: ${describeCsvError(error)}`,
            typeof error.lines === "number" ? error.lines : null,
          ),
        ],
      };
    }
    throw error;
  }

  const [headerRecord, ...dataRecords] = records;
  const header = (headerRecord?.record ?? []).map((name) => name.trim());
  const issues: ImportIssue[] = [];

  // Map each header position to a known column.
  const positions: (ImportColumn | null)[] = [];
  const seen = new Set<ImportColumn>();
  for (const name of header) {
    const column = BY_LOWERCASE.get(name.toLowerCase()) ?? null;
    if (column === null) {
      if (name !== "") issues.push(fileIssue(`Unknown column "${name}"`, 1));
    } else if (seen.has(column)) {
      issues.push(fileIssue(`Column "${column}" appears twice`, 1));
    } else {
      seen.add(column);
    }
    positions.push(column);
  }
  const missing = COLUMN_NAMES.filter((name) => !seen.has(name));
  if (missing.length > 0) issues.push(fileIssue(`Missing columns: ${missing.join(", ")}`, 1));
  if (issues.length > 0) return { rows: [], issues };

  if (dataRecords.length === 0) {
    return { rows: [], issues: [fileIssue("The file has no employee rows below the header")] };
  }
  if (dataRecords.length > MAX_IMPORT_ROWS) {
    return {
      rows: [],
      issues: [
        fileIssue(
          `The file has ${dataRecords.length.toLocaleString("en-US")} rows; the limit is ${MAX_IMPORT_ROWS.toLocaleString("en-US")}`,
        ),
      ],
    };
  }

  const rows: ParsedRow[] = [];
  for (const { record, info } of dataRecords) {
    if (record.length !== header.length) {
      issues.push(
        fileIssue(`Expected ${header.length} values but found ${record.length}`, info.lines),
      );
      continue;
    }
    const values = {} as Record<ImportColumn, string>;
    positions.forEach((column, index) => {
      if (column) values[column] = record[index] ?? "";
    });
    rows.push({ row: info.lines, values });
  }
  return { rows, issues };
}

/**
 * Whole numbers as people type them: "78000" or "78,000". A dot is never accepted: "78.000"
 * means 78 thousand in much of Europe but 78 elsewhere, and guessing could import a salary a
 * thousand times too small. Anything else ("78.000", "78k") is passed on unchanged so validation
 * reports it.
 */
export function toAmount(text: string): number | string | undefined {
  const value = text.trim();
  if (value === "") return undefined;
  if (/^\d{1,3}(,\d{3})+$/.test(value)) return Number(value.replace(/,/g, ""));
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}

export type ImportReference = {
  /** Country code → currency, for the countries that exist. */
  countries: ReadonlyMap<string, string>;
  jobTitles: ReadonlySet<string>;
  /** Emails already in the system (lower-case) → employee code. */
  existingEmails: ReadonlyMap<string, string>;
  /** Latest hire date that is not in the future (see latestAllowedDate). */
  latestAllowedDate: string;
};

export type ValidRow = { row: number; input: CreateEmployeeInput };

/** CSV column for a field of CreateEmployeeInput (only the country is named differently). */
const columnFor = (field: string): string => (field === "countryCode" ? "country" : field);

/**
 * Checks every row with the same schema as the Add employee form, then against the reference
 * data. A row is valid only if it has no problems at all.
 */
export function validateEmployeeRows(
  rows: readonly ParsedRow[],
  reference: ImportReference,
): { valid: ValidRow[]; issues: ImportIssue[] } {
  const valid: ValidRow[] = [];
  const issues: ImportIssue[] = [];
  const firstRowForEmail = new Map<string, number>();

  for (const { row, values } of rows) {
    const rowIssues: ImportIssue[] = [];
    const add = (column: string | null, message: string) =>
      rowIssues.push({ row, column, message });

    const parsed = CreateEmployeeSchema.safeParse({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      countryCode: values.country,
      jobTitle: values.jobTitle,
      level: toAmount(values.level),
      hireDate: values.hireDate,
      baseSalary: toAmount(values.baseSalary),
      targetBonus: toAmount(values.targetBonus),
    });

    // Format problems first, one message per column.
    const reported = new Set<string>();
    for (const column of ["level", "baseSalary", "targetBonus"] as const) {
      if (values[column].includes(".")) {
        reported.add(column);
        add(column, "Use a whole number without dots (78000 or 78,000)");
      }
    }
    for (const issue of parsed.success ? [] : parsed.error.issues) {
      const column = columnFor(String(issue.path[0] ?? ""));
      if (reported.has(column)) continue;
      reported.add(column);
      add(column || null, issue.message);
    }

    // Then the data checks, for every column that is well-formed, even if other columns in
    // the row aren't: HR sees all of a row's problems in one pass, not one round per upload.
    const ok = (column: string) => !reported.has(column);
    const country = values.country.trim().toUpperCase();
    const jobTitle = values.jobTitle.trim();
    const email = values.email.trim().toLowerCase();
    const hireDate = values.hireDate.trim();
    if (ok("country") && !reference.countries.has(country)) {
      add("country", `Unknown country "${country}"`);
    }
    if (ok("jobTitle") && !reference.jobTitles.has(jobTitle)) {
      add("jobTitle", `Unknown job title "${jobTitle}"`);
    }
    if (ok("hireDate") && hireDate > reference.latestAllowedDate) {
      add("hireDate", `Hire date ${hireDate} is in the future`);
    }
    if (ok("email")) {
      const existing = reference.existingEmails.get(email);
      if (existing) add("email", `Already in the system as ${existing}`);
      const earlier = firstRowForEmail.get(email);
      if (earlier !== undefined) add("email", `Same email as row ${earlier}`);
      else firstRowForEmail.set(email, row);
    }

    if (parsed.success && rowIssues.length === 0) valid.push({ row, input: parsed.data });
    issues.push(...rowIssues);
  }
  return { valid, issues };
}
