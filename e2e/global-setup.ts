import { execFileSync } from "node:child_process";

/** Rebuilds and seeds the disposable salary_e2e database before the run. */
export default function globalSetup(): void {
  execFileSync(
    "npx",
    ["--no-install", "tsx", "--conditions=source", "apps/api/scripts/prepare-e2e-db.ts"],
    { stdio: "inherit" },
  );
}
