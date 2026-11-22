import { defineConfig } from "vitest/config";

// Resolve workspace packages (e.g. @salary/shared) to their TypeScript source in tests.
// Tests run in Node, which uses the server-side ("ssr") resolution settings.
const conditions = ["source", "module", "node", "development|production"];

export default defineConfig({
  resolve: { conditions },
  ssr: { resolve: { conditions } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
