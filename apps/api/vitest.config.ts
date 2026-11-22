import { defineConfig } from "vitest/config";

// Resolve workspace packages (e.g. @salary/shared) to their TypeScript source in tests.
// The rest mirrors Vite's default server conditions.
const conditions = ["source", "module", "node", "development|production"];

export default defineConfig({
  resolve: { conditions },
  ssr: { resolve: { conditions } },
});
