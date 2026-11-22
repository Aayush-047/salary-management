import type { EmployeeListQuery } from "@salary/shared";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { applyChange, clearFilters, parseListQuery, toSearchParams } from "./url-state";

/**
 * The employee list state (filters, sort, page), stored in the URL so that refresh,
 * back/forward and shared links all reproduce the same view.
 */
export function useEmployeeListQuery() {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => parseListQuery(params), [params]);

  /** `replace` avoids a history entry per keystroke while typing a search. */
  const update = useCallback(
    (change: Partial<EmployeeListQuery>, options?: { replace?: boolean }) => {
      setParams(toSearchParams(applyChange(query, change)), options);
    },
    [query, setParams],
  );

  const reset = useCallback(() => {
    setParams(toSearchParams(clearFilters(query)));
  }, [query, setParams]);

  return { query, update, reset };
}
