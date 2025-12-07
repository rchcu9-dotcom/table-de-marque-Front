import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/unit/setup.ts"],
    exclude: [
      "node_modules",
      "dist",
      ".git",
      "tests/e2e",
      "tests/e2e-prod",
      "tests/match-list.spec.ts"
    ]
  }
});
