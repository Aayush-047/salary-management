import { createPrismaClient } from "../../src/db/client.js";
import { generateEmployees } from "./generate-employees.js";
import { seedEmployees } from "./seed-employees.js";
import { seedReference } from "./seed-reference.js";

/** Fixed inputs so every machine gets exactly the same dataset. */
const SEED = 42;
const EMPLOYEE_COUNT = 10_000;
const REFERENCE_DATE = new Date("2026-11-01");

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = createPrismaClient(url);

try {
  const started = performance.now();

  const reference = await seedReference(prisma);
  console.log("Reference data seeded:", reference);

  const { employees, plantedOutliers } = generateEmployees({
    seed: SEED,
    count: EMPLOYEE_COUNT,
    referenceDate: REFERENCE_DATE,
  });
  const inserted = await seedEmployees(prisma, employees);
  console.log("Employees seeded:", inserted);
  console.log(
    `Planted outliers: ${plantedOutliers.underpaid.length} underpaid, ${plantedOutliers.overpaid.length} overpaid`,
  );
  console.log(`Done in ${((performance.now() - started) / 1000).toFixed(1)}s`);
} finally {
  await prisma.$disconnect();
}
