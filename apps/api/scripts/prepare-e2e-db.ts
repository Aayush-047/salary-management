/**
 * Prepares the disposable end-to-end database: creates it if missing, applies migrations,
 * empties it and seeds the deterministic dataset. Run by Playwright's global setup.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { generateEmployees } from "../prisma/seed/generate-employees.js";
import { seedEmployees } from "../prisma/seed/seed-employees.js";
import { seedReference } from "../prisma/seed/seed-reference.js";
import { createPrismaClient } from "../src/db/client.js";
import { truncateAllTables } from "../src/db/maintenance.js";
import { assertIsE2eDatabaseUrl } from "../src/db/safety.js";

/** Same fixed inputs as the dev seed, so e2e tests can assert exact numbers. */
const SEED = 42;
const EMPLOYEE_COUNT = 10_000;
const REFERENCE_DATE = new Date("2026-11-01");

try {
  process.loadEnvFile(new URL("../../../.env", import.meta.url));
} catch {
  // No .env file (e.g. CI): rely on the process environment.
}

const url = assertIsE2eDatabaseUrl(process.env.E2E_DATABASE_URL);
const started = performance.now();

// 1. Create the database if needed. Docker only runs its init script on a brand-new volume,
//    so an existing local container may not have it yet.
const target = new URL(url);
const databaseName = decodeURIComponent(target.pathname.slice(1));
if (!/^[a-z0-9_]+$/.test(databaseName)) {
  throw new Error(`Unexpected database name "${databaseName}"`);
}
const maintenanceUrl = new URL(url);
maintenanceUrl.pathname = "/postgres";
const admin = new pg.Client({ connectionString: maintenanceUrl.toString() });
await admin.connect();
try {
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
  if (exists.rowCount === 0) {
    // Identifiers can't be bound as parameters; the name was validated above.
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    console.log(`Created database ${databaseName}`);
  }
} finally {
  await admin.end();
}

// 2. Apply migrations.
execFileSync("npx", ["--no-install", "prisma", "migrate", "deploy"], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env: { ...process.env, DATABASE_URL: url },
  stdio: "pipe",
});

// 3. Empty it and seed the deterministic dataset.
const prisma = createPrismaClient(url);
try {
  await truncateAllTables(prisma);
  await seedReference(prisma);
  const { employees } = generateEmployees({
    seed: SEED,
    count: EMPLOYEE_COUNT,
    referenceDate: REFERENCE_DATE,
  });
  const inserted = await seedEmployees(prisma, employees);
  console.log(
    `E2E database ready: ${inserted.employees} employees in ${((performance.now() - started) / 1000).toFixed(1)}s`,
  );
} finally {
  await prisma.$disconnect();
}
