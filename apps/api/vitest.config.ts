import { defineConfig } from "vitest/config";

// Resolve workspace packages (e.g. @salary/shared) to their TypeScript source in tests.
// The rest mirrors Vite's default server conditions.
const conditions = ["source", "module", "node", "development|production"];

export default defineConfig({
  resolve: { conditions },
  ssr: { resolve: { conditions } },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["test/unit/**/*.test.ts"] },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["test/integration/**/*.test.ts"],
          globalSetup: ["test/integration/global-setup.ts"],
          // Files share one database, so run them one at a time.
          fileParallelism: false,
        },
      },
    ],
  },
});
