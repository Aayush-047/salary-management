import type { EmployeeListQuery, MetaResponse } from "@salary/shared";
import { DEFAULT_QUERY } from "./url-state";

export type FilterChip = {
  /** Stable React key. */
  key: string;
  label: string;
  /** The change that removes just this filter value. */
  remove: Partial<EmployeeListQuery>;
};

const STATUS_LABELS: Record<EmployeeListQuery["status"], string> = {
  ACTIVE: "Active",
  TERMINATED: "Terminated",
  ALL: "All",
};

/** One removable chip per applied filter value (search excluded: it has its own box). */
export function filterChips(
  query: EmployeeListQuery,
  meta: Pick<MetaResponse, "countries"> | undefined,
): FilterChip[] {
  const countryName = new Map(meta?.countries.map((c) => [c.code, c.name]));
  const chips: FilterChip[] = [];

  if (query.status !== DEFAULT_QUERY.status) {
    chips.push({
      key: "status",
      label: `Status: ${STATUS_LABELS[query.status]}`,
      remove: { status: DEFAULT_QUERY.status },
    });
  }
  for (const code of query.country ?? []) {
    chips.push({
      key: `country:${code}`,
      label: `Country: ${countryName.get(code) ?? code}`,
      remove: { country: query.country!.filter((c) => c !== code) },
    });
  }
  for (const name of query.department ?? []) {
    chips.push({
      key: `department:${name}`,
      label: `Department: ${name}`,
      remove: { department: query.department!.filter((d) => d !== name) },
    });
  }
  for (const title of query.jobTitle ?? []) {
    chips.push({
      key: `jobTitle:${title}`,
      label: `Job title: ${title}`,
      remove: { jobTitle: query.jobTitle!.filter((t) => t !== title) },
    });
  }
  for (const level of query.level ?? []) {
    chips.push({
      key: `level:${level}`,
      label: `Level: L${level}`,
      remove: { level: query.level!.filter((l) => l !== level) },
    });
  }
  return chips;
}

/** Job titles to offer: all of them, or only those in the selected departments. */
export function availableJobTitles(
  departments: MetaResponse["departments"],
  selected: readonly string[] | undefined,
): string[] {
  return departments
    .filter((d) => !selected?.length || selected.includes(d.name))
    .flatMap((d) => d.jobTitles)
    .sort();
}
