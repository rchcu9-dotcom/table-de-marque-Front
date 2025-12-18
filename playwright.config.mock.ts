import { defineConfig } from "@playwright/test";

process.env.VITE_API_BASE_URL = process.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export default defineConfig({
  testDir: "tests/e2e-mock",
  use: {
    baseURL: "http://localhost:4174",
  },
  webServer: {
    command: "pnpm build && pnpm preview --port 4174",
    url: "http://localhost:4174",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      VITE_API_BASE_URL: "http://localhost:4000",
    },
  },
});
