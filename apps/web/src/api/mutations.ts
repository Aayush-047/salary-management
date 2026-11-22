import type {
  ChangePayInput,
  CorrectCompensationInput,
  CreateEmployeeInput,
  EmployeeDetail,
  RelocateInput,
  TerminateInput,
  UpdateEmployeeInput,
} from "@salary/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiSend } from "./client";

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
