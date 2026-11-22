import type { PrismaClient } from "../../src/db/client.js";
import { COUNTRIES, DEMO_USER_NAME, DEPARTMENTS, FX_AS_OF, FX_RATES } from "./reference-data.js";

export type ReferenceCounts = {
  fxRates: number;
  countries: number;
  departments: number;
  jobTitles: number;
  users: number;
};

/**
 * Inserts or updates all reference data in one transaction.
 * Idempotent: every write is keyed by a natural key, so re-running changes nothing.
 */
export async function seedReference(prisma: PrismaClient): Promise<ReferenceCounts> {
  return prisma.$transaction(async (tx) => {
    for (const { currency, rateToUsd } of FX_RATES) {
      await tx.fxRate.upsert({
        where: { currency },
        create: { currency, rateToUsd, asOfDate: FX_AS_OF },
        update: { rateToUsd, asOfDate: FX_AS_OF },
      });
    }

    for (const { code, name, currency } of COUNTRIES) {
      await tx.country.upsert({
        where: { code },
        create: { code, name, currency },
        update: { name, currency },
      });
    }

    for (const [departmentName, titles] of Object.entries(DEPARTMENTS)) {
      const department = await tx.department.upsert({
        where: { name: departmentName },
        create: { name: departmentName },
        update: {},
      });
      for (const title of titles) {
        await tx.jobTitle.upsert({
          where: { name: title },
          create: { name: title, departmentId: department.id },
          update: { departmentId: department.id },
        });
      }
    }

    // User.name is not unique (real users will have proper identities later), so
    // find-or-create the single demo user instead of upserting.
    const existingUser = await tx.user.findFirst({ where: { name: DEMO_USER_NAME } });
    if (!existingUser) {
      await tx.user.create({ data: { name: DEMO_USER_NAME } });
    }

    return {
      fxRates: await tx.fxRate.count(),
      countries: await tx.country.count(),
      departments: await tx.department.count(),
      jobTitles: await tx.jobTitle.count(),
      users: await tx.user.count(),
    };
  });
}
