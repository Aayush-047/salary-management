import type { EmployeeListQuery, MetaResponse } from "@salary/shared";
import { DEFAULT_QUERY } from "./url-state";

/**
 * Number of applied filter values shown on the Filters button: each selected country,
 * department, job title and level counts once, plus one for a non-default status.
 * Search is not counted; it has its own box.
 */
export function activeFilterCount(
  query: Pick<EmployeeListQuery, "status" | "country" | "department" | "jobTitle" | "level">,
): number {
  return (
    (query.status !== DEFAULT_QUERY.status ? 1 : 0) +
    (query.country?.length ?? 0) +
    (query.department?.length ?? 0) +
    (query.jobTitle?.length ?? 0) +
    (query.level?.length ?? 0)
  );
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
