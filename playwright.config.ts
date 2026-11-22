import { defineConfig, devices } from "@playwright/test";

/*
 * End-to-end tests run their own API (port 3100) and web app (port 5174) against a disposable
 * `salary_e2e` database, so they can run alongside `npm run dev` without touching dev data.
 */
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file (e.g. CI): rely on the process environment.
}

const API_PORT = 3100;
const WEB_PORT = 5174;
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://salary:salary@localhost:5432/salary_e2e";

export default defineConfig({
  testDir: "e2e",
  // Tests share one seeded database and only read from it; one worker keeps runs predictable.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev -w @salary/api",
      url: `http://localhost:${API_PORT}/health`,
      env: {
        PORT: String(API_PORT),
        DATABASE_URL: E2E_DATABASE_URL,
        CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
      },
      reuseExistingServer: false,
    },
    {
      command: `npm run dev -w @salary/web -- --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { VITE_API_URL: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
    },
  ],
});
