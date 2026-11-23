import type {
  ChangePayInput,
  CorrectCompensationInput,
  CreateEmployeeInput,
  EmployeeDetail,
  ImportCheckResponse,
  ImportResponse,
  RelocateInput,
  TerminateInput,
  UpdateEmployeeInput,
} from "@salary/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiSend, apiSendCsv } from "./client";

/**
 * Every write returns the employee's fresh detail. Store it directly, and refresh what else may
 * have changed: their audit history and any employee list (pay, title or country can move them).
 */
function useEmployeeWrite<TInput>(send: (input: TInput) => Promise<EmployeeDetail>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: async (detail) => {
      queryClient.setQueryData(["employee", detail.employeeCode], detail);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["employee", detail.employeeCode, "audit"] }),
        queryClient.invalidateQueries({ queryKey: ["employees"] }),
      ]);
    },
  });
}

const path = (code: string, suffix = "") => `/employees/${encodeURIComponent(code)}${suffix}`;

export const useCreateEmployee = () =>
  useEmployeeWrite((input: CreateEmployeeInput) =>
    apiSend<EmployeeDetail>("POST", "/employees", input),
  );

export const useUpdateEmployee = (code: string) =>
  useEmployeeWrite((input: UpdateEmployeeInput) =>
    apiSend<EmployeeDetail>("PATCH", path(code), input),
  );

export const useChangePay = (code: string) =>
  useEmployeeWrite((input: ChangePayInput) =>
    apiSend<EmployeeDetail>("POST", path(code, "/compensation"), input),
  );

export const useCorrectCompensation = () =>
  useEmployeeWrite(({ id, ...input }: CorrectCompensationInput & { id: number }) =>
    apiSend<EmployeeDetail>("PATCH", `/compensation/${id}`, input),
  );

export const useRelocate = (code: string) =>
  useEmployeeWrite((input: RelocateInput) =>
    apiSend<EmployeeDetail>("POST", path(code, "/relocate"), input),
  );

export const useTerminate = (code: string) =>
  useEmployeeWrite((input: TerminateInput) =>
    apiSend<EmployeeDetail>("POST", path(code, "/terminate"), input),
  );

type CsvUpload = { filename: string; text: string };
const importPath = (suffix: string, filename: string) =>
  `/imports/employees${suffix}?filename=${encodeURIComponent(filename)}`;

/** Checks a file; saves nothing. */
export const useCheckImport = () =>
  useMutation({
    mutationFn: ({ filename, text }: CsvUpload) =>
      apiSendCsv<ImportCheckResponse>(importPath("/check", filename), text),
  });

/** Imports every row or none; refreshes anything that lists or summarises employees. */
export function useImportEmployees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ filename, text }: CsvUpload) =>
      apiSendCsv<ImportResponse>(importPath("", filename), text),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["employees"] }),
        queryClient.invalidateQueries({ queryKey: ["insights"] }),
      ]);
    },
  });
}
