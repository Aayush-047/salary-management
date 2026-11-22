import { createPrismaClient, type PrismaClient } from "../../../src/db/client.js";
import { truncateAllTables } from "../../../src/db/maintenance.js";
import { assertIsTestDatabaseUrl } from "../../../src/db/safety.js";

try {
  process.loadEnvFile(new URL("../../../../../.env", import.meta.url));
} catch {
  // No .env file (e.g. CI): rely on the process environment.
}

/** Prisma client for the test database (guarded: the name must end in "_test"). */
export const testPrisma: PrismaClient = createPrismaClient(
  assertIsTestDatabaseUrl(process.env.TEST_DATABASE_URL),
);

/** Empties every application table and resets id sequences. Keeps the migrations table. */
export async function resetDatabase(prisma: PrismaClient = testPrisma): Promise<void> {
  await truncateAllTables(prisma);
}
