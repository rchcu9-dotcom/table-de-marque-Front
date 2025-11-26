import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/tests/setup.ts",

    // ⛔ Empêche Vitest de lire les tests Playwright
    exclude: ["tests/**/*.spec.ts"],
  },
});
