/**
 * CSV import of new employees: one row per employee with their current pay. These definitions
 * drive the API's checks, the downloadable template and the instructions on the Import page,
 * so the three can never disagree.
 */

export const MAX_IMPORT_ROWS = 10_000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export const IMPORT_COLUMNS = [
  { name: "firstName", example: "Lena", help: "Required." },
  { name: "lastName", example: "Fischer", help: "Required." },
  {
    name: "email",
    example: "lena.fischer@example.com",
    help: "Must be unique. People already in the system are rejected; change them in the app.",
  },
  {
    name: "country",
    example: "DE",
    help: "Two-letter country code. It also sets the pay currency.",
  },
  { name: "jobTitle", example: "Data Scientist", help: "Exactly as listed in the app." },
  { name: "level", example: "3", help: "A number from 1 to 6." },
  { name: "hireDate", example: "2026-01-15", help: "YYYY-MM-DD, not in the future." },
  {
    name: "baseSalary",
    example: "78000",
    help: "Annual amount in the country's currency, whole number, no currency symbol.",
  },
  {
    name: "targetBonus",
    example: "7800",
    help: "Annual target bonus in the same currency; 0 if none.",
  },
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number]["name"];

/** A template with the header and one example row. */
export function importTemplateCsv(): string {
  const header = IMPORT_COLUMNS.map((c) => c.name).join(",");
  const example = IMPORT_COLUMNS.map((c) => c.example).join(",");
  return `${header}\n${example}\n`;
}

/**
 * One problem. `row` is the spreadsheet row number (the header is row 1), null for problems
 * with the whole file; `column` is null when the problem isn't about one column.
 */
export type ImportIssue = { row: number | null; column: string | null; message: string };

/** Result of checking a file without saving anything. */
export type ImportCheckResponse = {
  filename: string;
  /** Employee rows found (excluding the header and blank lines). */
  rows: number;
  valid: boolean;
  /** Total problems; `errors` lists at most the first 200. */
  errorCount: number;
  errors: ImportIssue[];
  /** Rows per country, for the "ready to import" summary. */
  byCountry: { code: string; name: string; count: number }[];
};

export type ImportResponse = {
  imported: number;
  firstCode: string;
  lastCode: string;
};
