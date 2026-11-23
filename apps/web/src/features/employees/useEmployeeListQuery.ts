import type { EmployeeListQuery } from "@salary/shared";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { latestSearchParams } from "../../lib/search-params";
import { applyChange, clearFilters, parseListQuery, toSearchParams } from "./url-state";

/**
 * The employee list state (filters, sort, page), stored in the URL so that refresh,
 * back/forward and shared links all reproduce the same view.
 */
export function useEmployeeListQuery() {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => parseListQuery(params), [params]);

  /**
   * Builds on the URL as it is now, not as of the last render, so quick successive changes
   * (a debounced search landing right after a filter change) can't drop each other.
   * `replace` avoids a history entry per keystroke while typing a search.
   */
  const update = useCallback(
    (change: Partial<EmployeeListQuery>, options?: { replace?: boolean }) => {
      const latest = parseListQuery(latestSearchParams());
      setParams(toSearchParams(applyChange(latest, change)), options);
    },
    [setParams],
  );

  const reset = useCallback(() => {
    setParams(toSearchParams(clearFilters(parseListQuery(latestSearchParams()))));
  }, [setParams]);

  return { query, update, reset };
}
