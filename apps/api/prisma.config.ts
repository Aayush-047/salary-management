import { defineConfig } from "prisma/config";

// Prisma 7 does not load .env automatically. Load the repo-root .env when present
// (local development); in CI/production the variables come from the environment.
try {
  process.loadEnvFile(new URL("../../.env", import.meta.url));
} catch {
  // No .env file: rely on the process environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Optional on purpose: `prisma generate` (run on install, in CI and builds) needs no
  // database. Commands that do (`migrate`) fail with a clear error when it is missing.
  datasource: { url: process.env.DATABASE_URL },
});
