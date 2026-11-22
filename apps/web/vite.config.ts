import react from "@vitejs/plugin-react";
import { defaultClientConditions, defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Resolve workspace packages (e.g. @salary/shared) to their TypeScript source.
  resolve: { conditions: ["source", ...defaultClientConditions] },
  // Read the single repo-root .env so API and web share one config file in development.
  envDir: "../../",
  server: { port: 5173 },
});
