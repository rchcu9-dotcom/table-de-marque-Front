import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  webServer: {
    command: "pnpm preview",
    url: "http://localhost:4173",
    reuseExistingServer: false,
    timeout: 60_000
  }
});
