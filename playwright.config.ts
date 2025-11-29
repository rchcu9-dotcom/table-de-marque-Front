import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  webServer: {
    command: "pnpm build && pnpm preview --port 4174",
    url: "http://localhost:4174",
    reuseExistingServer: false,
    timeout: 60_000
  }
});
