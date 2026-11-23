import type {
  AuditListResponse,
  EmployeeDetail,
  EmployeeListQuery,
  EmployeeListResponse,
  MetaResponse,
  PayStatsQuery,
  PayStatsResponse,
} from "@salary/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toSearchParams } from "../features/employees/url-state";
import { ApiError, apiGet } from "./client";

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

/** Don't retry requests that can't succeed (e.g. an unknown employee code). */
function retryUnlessClientError(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function useEmployee(code: string) {
  return useQuery({
    queryKey: ["employee", code],
    queryFn: () => apiGet<EmployeeDetail>(`/employees/${encodeURIComponent(code)}`),
    retry: retryUnlessClientError,
  });
}

export function useEmployeeAudit(code: string, options: { enabled: boolean }) {
  return useQuery({
    enabled: options.enabled,
    queryKey: ["employee", code, "audit"],
    queryFn: () => apiGet<AuditListResponse>(`/employees/${encodeURIComponent(code)}/audit`),
    retry: retryUnlessClientError,
  });
}

/** Insight queries share the list's filters; build the query string the same way. */
function insightParams(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, String(item));
  }
  return params.toString();
}

export function usePayStats(query: PayStatsQuery) {
  return useQuery({
    queryKey: ["insights", "pay-stats", query],
    queryFn: () => apiGet<PayStatsResponse>(`/insights/pay-stats?${insightParams(query)}`),
    placeholderData: keepPreviousData,
  });
}
