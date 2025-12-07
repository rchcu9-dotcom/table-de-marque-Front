import { defineConfig } from "@playwright/test";

// Force local API base for e2e to keep network fully mocked/stable
process.env.VITE_API_BASE_URL = process.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  webServer: {
    command: "pnpm build && pnpm preview --port 4174",
    url: "http://localhost:4174",
    reuseExistingServer: false,
    timeout: 60_000
  }
});
