import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertIsTestDatabaseUrl } from "../../src/db/safety.js";

/** Runs once per test run: checks the target is a test database, then applies migrations. */
export default function setup(): void {
  try {
    process.loadEnvFile(new URL("../../../../.env", import.meta.url));
  } catch {
    // No .env file (e.g. CI): rely on the process environment.
  }
  const url = assertIsTestDatabaseUrl(process.env.TEST_DATABASE_URL);

  const apiDir = fileURLToPath(new URL("../../", import.meta.url));
  execFileSync("npx", ["--no-install", "prisma", "migrate", "deploy"], {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}
