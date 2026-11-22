import type { PrismaClient } from "../db/client.js";

export async function findReferenceData(prisma: PrismaClient) {
  const [countries, departments, fxRates] = await Promise.all([
    prisma.country.findMany({
      select: { code: true, name: true, currency: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      select: { name: true, jobTitles: { select: { name: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.fxRate.findMany({ orderBy: { currency: "asc" } }),
  ]);
  return { countries, departments, fxRates };
}
