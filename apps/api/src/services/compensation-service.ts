import type {
  ChangePayInput,
  CorrectCompensationInput,
  EmployeeDetail,
  RelocateInput,
} from "@salary/shared";
import type { PrismaClient } from "../db/client.js";
import { diffFields } from "../domain/audit-diff.js";
import { fromIsoDate, todayIso, toIsoDate, type Clock } from "../domain/clock.js";
import { conflict, invalid, notFound } from "../domain/errors.js";
import {
  checkAfterLatestEntry,
  checkBetweenNeighbours,
  checkPayEntryDate,
  checkPromotion,
} from "../domain/rules.js";
import { getCurrentUser, recordAudit, syncCurrentCompensation } from "./audit.js";
import { getEmployeeDetail, requireEmployee } from "./employee-detail-service.js";

type Employee = Awaited<ReturnType<typeof requireEmployee>>;

function assertActive(employee: Employee) {
  if (employee.status === "TERMINATED") {
    throw conflict(
      "EMPLOYEE_TERMINATED",
      `${employee.employeeCode} has left the company; only pay corrections are allowed`,
    );
  }
}

/** Date checks shared by pay changes and relocations: within employment, after the latest entry. */
function checkNewEntryDate(employee: Employee, effectiveDate: string, clock: Clock) {
  checkPayEntryDate({
    effectiveDate,
    hireDate: toIsoDate(employee.hireDate),
    terminationDate: null,
    today: todayIso(clock),
  });
  const latest = employee.compensationEntries.at(-1);
  if (latest) {
    checkAfterLatestEntry({ effectiveDate, latestEntryDate: toIsoDate(latest.effectiveDate) });
  }
}

/** A new pay entry; a promotion may also change level and/or title in the same event. */
export async function changePay(
  prisma: PrismaClient,
  clock: Clock,
  code: string,
  input: ChangePayInput,
): Promise<EmployeeDetail> {
  await prisma.$transaction(async (tx) => {
    const employee = await requireEmployee(tx, code);
    assertActive(employee);
    checkNewEntryDate(employee, input.effectiveDate, clock);

    let newJobTitleId: number | undefined;
    if (input.reason === "PROMOTION") {
      checkPromotion({
        currentLevel: employee.level,
        newLevel: input.newLevel,
        currentJobTitle: employee.jobTitle.name,
        newJobTitle: input.newJobTitle,
      });
      if (input.newJobTitle !== undefined && input.newJobTitle !== employee.jobTitle.name) {
        const title = await tx.jobTitle.findUnique({ where: { name: input.newJobTitle } });
        if (!title) {
          throw invalid("UNKNOWN_JOB_TITLE", `Job title "${input.newJobTitle}" does not exist`);
        }
        newJobTitleId = title.id;
      }
      await tx.employee.update({
        where: { id: employee.id },
        data: { level: input.newLevel, jobTitleId: newJobTitleId },
      });
    }

    const entry = await tx.compensationEntry.create({
      data: {
        employeeId: employee.id,
        effectiveDate: fromIsoDate(input.effectiveDate),
        baseSalary: input.baseSalary,
        targetBonus: input.targetBonus,
        currency: employee.country.currency,
        reason: input.reason,
        note: input.note ?? null,
      },
    });
    await syncCurrentCompensation(tx, employee.id);

    const actor = await getCurrentUser(tx);
    await recordAudit(tx, {
      actorId: actor.id,
      employeeId: employee.id,
      entityType: "COMPENSATION_ENTRY",
      entityId: entry.id,
      action: "CREATE",
      changes: [
        { field: "payReason", from: null, to: input.reason },
        { field: "effectiveDate", from: null, to: input.effectiveDate },
        ...diffFields(
          {
            baseSalary: employee.currentBaseSalary,
            targetBonus: employee.currentTargetBonus,
            level: employee.level,
            jobTitle: employee.jobTitle.name,
          },
          {
            baseSalary: input.baseSalary,
            targetBonus: input.targetBonus,
            ...(input.newLevel !== undefined && { level: input.newLevel }),
            ...(input.newJobTitle !== undefined && { jobTitle: input.newJobTitle }),
          },
          ["baseSalary", "targetBonus", "level", "jobTitle"],
        ),
      ],
      reason: input.note,
    });
  });

  return getEmployeeDetail(prisma, code);
}

/** Fixes a mistake in an existing pay entry. Allowed for leavers too. */
export async function correctCompensation(
  prisma: PrismaClient,
  clock: Clock,
  entryId: number,
  input: CorrectCompensationInput,
): Promise<EmployeeDetail> {
  const employeeCode = await prisma.$transaction(async (tx) => {
    const target = await tx.compensationEntry.findUnique({
      where: { id: entryId },
      include: { employee: true },
    });
    if (!target) {
      throw notFound("ENTRY_NOT_FOUND", `Pay entry ${entryId} not found`);
    }
    const employee = await requireEmployee(tx, target.employee.employeeCode);
    const entries = employee.compensationEntries;
    const index = entries.findIndex((e) => e.id === entryId);

    const after = {
      ...(input.effectiveDate !== undefined && { effectiveDate: fromIsoDate(input.effectiveDate) }),
      ...(input.baseSalary !== undefined && { baseSalary: input.baseSalary }),
      ...(input.targetBonus !== undefined && { targetBonus: input.targetBonus }),
    };
    const changes = diffFields(target, after, ["effectiveDate", "baseSalary", "targetBonus"]);
    if (changes.length === 0) {
      throw invalid("NO_CHANGES", "Nothing changed: the new values match the current ones");
    }

    if (changes.some((c) => c.field === "effectiveDate")) {
      if (target.reason === "HIRE") {
        throw invalid(
          "HIRE_ENTRY_DATE",
          "The hire entry is dated by the hire date; change the hire date on the profile instead",
        );
      }
      checkPayEntryDate({
        effectiveDate: input.effectiveDate!,
        hireDate: toIsoDate(employee.hireDate),
        terminationDate: employee.terminationDate ? toIsoDate(employee.terminationDate) : null,
        today: todayIso(clock),
      });
      const previous = entries[index - 1];
      const next = entries[index + 1];
      checkBetweenNeighbours({
        effectiveDate: input.effectiveDate!,
        previousDate: previous ? toIsoDate(previous.effectiveDate) : null,
        nextDate: next ? toIsoDate(next.effectiveDate) : null,
      });
    }

    await tx.compensationEntry.update({ where: { id: entryId }, data: after });
    await syncCurrentCompensation(tx, employee.id);

    const actor = await getCurrentUser(tx);
    await recordAudit(tx, {
      actorId: actor.id,
      employeeId: employee.id,
      entityType: "COMPENSATION_ENTRY",
      entityId: entryId,
      action: "UPDATE",
      changes,
      reason: input.note,
    });
    return employee.employeeCode;
  });

  return getEmployeeDetail(prisma, employeeCode);
}

/** Moves an employee to another country with new pay in that country's currency, as one event. */
export async function relocate(
  prisma: PrismaClient,
  clock: Clock,
  code: string,
  input: RelocateInput,
): Promise<EmployeeDetail> {
  await prisma.$transaction(async (tx) => {
    const employee = await requireEmployee(tx, code);
    assertActive(employee);
    if (input.countryCode === employee.countryCode) {
      throw invalid(
        "SAME_COUNTRY",
        `${employee.employeeCode} already works in ${employee.country.name}`,
      );
    }
    const country = await tx.country.findUnique({ where: { code: input.countryCode } });
    if (!country) {
      throw invalid("UNKNOWN_COUNTRY", `Country "${input.countryCode}" does not exist`);
    }
    checkNewEntryDate(employee, input.effectiveDate, clock);

    await tx.employee.update({ where: { id: employee.id }, data: { countryCode: country.code } });
    await tx.compensationEntry.create({
      data: {
        employeeId: employee.id,
        effectiveDate: fromIsoDate(input.effectiveDate),
        baseSalary: input.baseSalary,
        targetBonus: input.targetBonus,
        currency: country.currency,
        reason: "RELOCATION",
        note: input.note,
      },
    });
    await syncCurrentCompensation(tx, employee.id);

    const actor = await getCurrentUser(tx);
    await recordAudit(tx, {
      actorId: actor.id,
      employeeId: employee.id,
      entityType: "EMPLOYEE",
      entityId: employee.id,
      action: "UPDATE",
      changes: [
        { field: "effectiveDate", from: null, to: input.effectiveDate },
        ...diffFields(
          {
            country: employee.countryCode,
            currency: employee.currentCurrency,
            baseSalary: employee.currentBaseSalary,
            targetBonus: employee.currentTargetBonus,
          },
          {
            country: country.code,
            currency: country.currency,
            baseSalary: input.baseSalary,
            targetBonus: input.targetBonus,
          },
          ["country", "currency", "baseSalary", "targetBonus"],
        ),
      ],
      reason: input.note,
    });
  });

  return getEmployeeDetail(prisma, code);
}
