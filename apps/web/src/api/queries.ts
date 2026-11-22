import type { EmployeeListQuery, EmployeeListResponse, MetaResponse } from "@salary/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toSearchParams } from "../features/employees/url-state";
import { apiGet } from "./client";

/** Reference data for filters and labels; it changes rarely. */
export function useMeta() {
  return useQuery({
    queryKey: ["meta"],
    queryFn: () => apiGet<MetaResponse>("/meta"),
    staleTime: 5 * 60_000,
  });
}

/** One page of employees. The previous page stays visible while the next one loads. */
export function useEmployees(query: EmployeeListQuery) {
  return useQuery({
    queryKey: ["employees", query],
    queryFn: () => {
      const params = toSearchParams(query).toString();
      return apiGet<EmployeeListResponse>(`/employees${params ? `?${params}` : ""}`);
    },
    placeholderData: keepPreviousData,
  });
}
