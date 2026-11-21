import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Read the single repo-root .env so API and web share one config file in development.
  envDir: "../../",
  server: { port: 5173 },
});
