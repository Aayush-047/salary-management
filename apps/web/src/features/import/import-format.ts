import { MAX_IMPORT_BYTES, type ImportCheckResponse } from "@salary/shared";

/** "1 employee" / "1,240 employees". */
export function employeesLabel(count: number): string {
  return count === 1 ? "1 employee" : `${count.toLocaleString("en-US")} employees`;
}

/** "410 in Germany, 300 in India and 1 in Japan". */
export function countriesSummary(byCountry: ImportCheckResponse["byCountry"]): string {
  const parts = byCountry.map((c) => `${c.count.toLocaleString("en-US")} in ${c.name}`);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/** Checked in the browser too, so a huge file isn't uploaded only to be refused. */
export function fileTooLarge(sizeInBytes: number): boolean {
  return sizeInBytes > MAX_IMPORT_BYTES;
}
