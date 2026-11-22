import type { AuditAction, AuditEntity, AuditFieldChange } from "@salary/shared";
import type { PrismaClient } from "../db/client.js";
import type { Prisma } from "../generated/prisma/client.js";

/** A Prisma client or an open transaction; writes take a transaction. */
export type Db = PrismaClient | Prisma.TransactionClient;

/** The single demo user every change is attributed to until real authentication exists. */
const DEMO_USER_NAME = "HR Manager";

export type CurrentUser = { id: number; name: string };

/**
 * Who is making the change. This is the one place real authentication would plug in:
 * replace the lookup with the signed-in user from the request.
 */
export async function getCurrentUser(db: Db): Promise<CurrentUser> {
  const user = await db.user.findFirst({ where: { name: DEMO_USER_NAME } });
  if (!user) {
    throw new Error(`User "${DEMO_USER_NAME}" not found: seed the reference data first`);
  }
  return { id: user.id, name: user.name };
}

export async function recordAudit(
  tx: Prisma.TransactionClient,
  entry: {
    actorId: number;
    employeeId: number;
    entityType: AuditEntity;
    entityId: number;
    action: AuditAction;
    changes: AuditFieldChange[];
    reason?: string | undefined;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      employeeId: entry.employeeId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      changes: entry.changes as Prisma.InputJsonValue,
      reason: entry.reason ?? null,
    },
  });
}

/**
 * Copies the latest pay entry (by effective date) onto the employee's current-pay fields.
 * Called in the same transaction as every change to pay entries, so the two never disagree.
 */
export async function syncCurrentCompensation(
  tx: Prisma.TransactionClient,
  employeeId: number,
): Promise<void> {
  const latest = await tx.compensationEntry.findFirst({
    where: { employeeId },
    orderBy: { effectiveDate: "desc" },
  });
  if (!latest) {
    throw new Error(`Employee ${employeeId} has no compensation entries`);
  }
  await tx.employee.update({
    where: { id: employeeId },
    data: {
      currentBaseSalary: latest.baseSalary,
      currentTargetBonus: latest.targetBonus,
      currentCurrency: latest.currency,
    },
  });
}
