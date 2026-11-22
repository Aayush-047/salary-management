import type {
  CreateEmployeeInput,
  EmployeeDetail,
  TerminateInput,
  UpdateEmployeeInput,
} from "@salary/shared";
import type { PrismaClient } from "../db/client.js";
import { diffFields } from "../domain/audit-diff.js";
import { fromIsoDate, latestAllowedDate, toIsoDate, type Clock } from "../domain/clock.js";
import { conflict, invalid } from "../domain/errors.js";
import { checkHireDateChange, checkPayEntryDate, checkTerminationDate } from "../domain/rules.js";
import { getCurrentUser, recordAudit, type Db } from "./audit.js";
import { getEmployeeDetail, requireEmployee } from "./employee-detail-service.js";

/** Fields shown in the audit log, in display order. */
const PROFILE_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "country",
  "jobTitle",
  "level",
  "hireDate",
  "baseSalary",
  "targetBonus",
  "currency",
] as const;

async function requireJobTitleId(db: Db, name: string): Promise<number> {
  const title = await db.jobTitle.findUnique({ where: { name } });
  if (!title) throw invalid("UNKNOWN_JOB_TITLE", `Job title "${name}" does not exist`);
  return title.id;
}

async function requireCountry(db: Db, code: string) {
  const country = await db.country.findUnique({ where: { code } });
  if (!country) throw invalid("UNKNOWN_COUNTRY", `Country "${code}" does not exist`);
  return country;
}

async function assertEmailAvailable(db: Db, email: string, exceptEmployeeId?: number) {
  const owner = await db.employee.findUnique({ where: { email } });
  if (owner && owner.id !== exceptEmployeeId) {
    throw conflict("EMAIL_TAKEN", `${email} is already used by ${owner.employeeCode}`);
  }
}

/** Next code after the highest existing one, e.g. E10000 → E10001. */
async function nextEmployeeCode(db: Db): Promise<string> {
  const [row] = await db.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(SUBSTRING("employeeCode" FROM 2) AS INTEGER)) AS max FROM "Employee"`;
  return `E${String((row?.max ?? 0) + 1).padStart(5, "0")}`;
}

function assertActive(employee: { status: string; employeeCode: string }) {
  if (employee.status === "TERMINATED") {
    throw conflict(
      "EMPLOYEE_TERMINATED",
      `${employee.employeeCode} has left the company; only pay corrections are allowed`,
    );
  }
}

export async function createEmployee(
  prisma: PrismaClient,
  clock: Clock,
  input: CreateEmployeeInput,
): Promise<EmployeeDetail> {
  checkPayEntryDate({
    effectiveDate: input.hireDate,
    hireDate: input.hireDate,
    terminationDate: null,
    latestAllowedDate: latestAllowedDate(clock),
    label: "Hire date",
  });

  const code = await prisma.$transaction(async (tx) => {
    const country = await requireCountry(tx, input.countryCode);
    const jobTitleId = await requireJobTitleId(tx, input.jobTitle);
    await assertEmailAvailable(tx, input.email);
    const actor = await getCurrentUser(tx);
    const employeeCode = await nextEmployeeCode(tx);
    const hireDate = fromIsoDate(input.hireDate);

    const employee = await tx.employee.create({
      data: {
        employeeCode,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        countryCode: country.code,
        jobTitleId,
        level: input.level,
        hireDate,
        currentBaseSalary: input.baseSalary,
        currentTargetBonus: input.targetBonus,
        currentCurrency: country.currency,
      },
    });
    await tx.compensationEntry.create({
      data: {
        employeeId: employee.id,
        effectiveDate: hireDate,
        baseSalary: input.baseSalary,
        targetBonus: input.targetBonus,
        currency: country.currency,
        reason: "HIRE",
        note: input.note ?? null,
      },
    });
    await recordAudit(tx, {
      actorId: actor.id,
      employeeId: employee.id,
      entityType: "EMPLOYEE",
      entityId: employee.id,
      action: "CREATE",
      changes: diffFields(
        {},
        {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          country: country.code,
          jobTitle: input.jobTitle,
          level: input.level,
          hireDate,
          baseSalary: input.baseSalary,
          targetBonus: input.targetBonus,
          currency: country.currency,
        },
        PROFILE_FIELDS,
      ),
      reason: input.note,
    });
    return employeeCode;
  });

  return getEmployeeDetail(prisma, code);
}

export async function updateEmployee(
  prisma: PrismaClient,
  clock: Clock,
  code: string,
  input: UpdateEmployeeInput,
): Promise<EmployeeDetail> {
  await prisma.$transaction(async (tx) => {
    const employee = await requireEmployee(tx, code);
    assertActive(employee);

    const before = {
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      jobTitle: employee.jobTitle.name,
      level: employee.level,
      hireDate: employee.hireDate,
    };
    const after: Partial<typeof before> = {};
    if (input.firstName !== undefined) after.firstName = input.firstName;
    if (input.lastName !== undefined) after.lastName = input.lastName;
    if (input.email !== undefined) after.email = input.email;
    if (input.jobTitle !== undefined) after.jobTitle = input.jobTitle;
    if (input.level !== undefined) after.level = input.level;
    if (input.hireDate !== undefined) after.hireDate = fromIsoDate(input.hireDate);

    const changes = diffFields(before, after, PROFILE_FIELDS);
    if (changes.length === 0) {
      throw invalid("NO_CHANGES", "Nothing changed: the new values match the current ones");
    }
    const changed = new Set(changes.map((c) => c.field));

    if (changed.has("email")) await assertEmailAvailable(tx, input.email!, employee.id);
    const jobTitleId = changed.has("jobTitle")
      ? await requireJobTitleId(tx, input.jobTitle!)
      : undefined;

    if (changed.has("hireDate")) {
      // The HIRE entry is the earliest; it moves with the hire date.
      const [hireEntry, firstChange] = employee.compensationEntries;
      checkHireDateChange({
        newHireDate: input.hireDate!,
        firstChangeDate: firstChange ? toIsoDate(firstChange.effectiveDate) : null,
        terminationDate: null,
        latestAllowedDate: latestAllowedDate(clock),
      });
      if (hireEntry) {
        await tx.compensationEntry.update({
          where: { id: hireEntry.id },
          data: { effectiveDate: fromIsoDate(input.hireDate!) },
        });
      }
    }

    await tx.employee.update({
      where: { id: employee.id },
      data: {
        firstName: after.firstName,
        lastName: after.lastName,
        email: after.email,
        jobTitleId,
        level: after.level,
        hireDate: after.hireDate,
      },
    });
    const actor = await getCurrentUser(tx);
    await recordAudit(tx, {
      actorId: actor.id,
      employeeId: employee.id,
      entityType: "EMPLOYEE",
      entityId: employee.id,
      action: "UPDATE",
      changes,
      reason: input.note,
    });
  });

  return getEmployeeDetail(prisma, code);
}

export async function terminateEmployee(
  prisma: PrismaClient,
  clock: Clock,
  code: string,
  input: TerminateInput,
): Promise<EmployeeDetail> {
  await prisma.$transaction(async (tx) => {
    const employee = await requireEmployee(tx, code);
    if (employee.status === "TERMINATED") {
      throw conflict("ALREADY_TERMINATED", `${employee.employeeCode} has already left`);
    }
    const latest = employee.compensationEntries.at(-1);
    checkTerminationDate({
      terminationDate: input.terminationDate,
      latestEntryDate: latest ? toIsoDate(latest.effectiveDate) : toIsoDate(employee.hireDate),
      latestAllowedDate: latestAllowedDate(clock),
    });

    const terminationDate = fromIsoDate(input.terminationDate);
    await tx.employee.update({
      where: { id: employee.id },
      data: { status: "TERMINATED", terminationDate },
    });
    const actor = await getCurrentUser(tx);
    await recordAudit(tx, {
      actorId: actor.id,
      employeeId: employee.id,
      entityType: "EMPLOYEE",
      entityId: employee.id,
      action: "TERMINATE",
      changes: diffFields(
        { status: employee.status, terminationDate: null },
        { status: "TERMINATED", terminationDate },
        ["status", "terminationDate"],
      ),
      reason: input.note,
    });
  });

  return getEmployeeDetail(prisma, code);
}
