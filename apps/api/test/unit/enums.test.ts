import {
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  COMPENSATION_REASONS,
  EMPLOYEE_STATUSES,
} from "@salary/shared";
import { describe, expect, it } from "vitest";
import {
  AuditAction,
  AuditEntity,
  CompensationReason,
  EmployeeStatus,
} from "../../src/generated/prisma/enums.js";

// The web app cannot import Prisma, so the shared package repeats these lists.
// This test fails if the two ever drift apart.
describe("shared constants match Prisma enums", () => {
  it.each([
    { name: "EmployeeStatus", shared: EMPLOYEE_STATUSES, prisma: EmployeeStatus },
    { name: "CompensationReason", shared: COMPENSATION_REASONS, prisma: CompensationReason },
    { name: "AuditAction", shared: AUDIT_ACTIONS, prisma: AuditAction },
    { name: "AuditEntity", shared: AUDIT_ENTITIES, prisma: AuditEntity },
  ])("$name", ({ shared, prisma }) => {
    expect([...shared].sort()).toEqual(Object.values(prisma).sort());
  });
});
