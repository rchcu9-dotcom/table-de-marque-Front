import { defineConfig } from "@playwright/test";

process.env.VITE_API_BASE_URL = process.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export default defineConfig({
  testDir: "tests/e2e-mock",
  // Chaque spec démarre son propre mock backend sur le même port fixe
  // (VITE_API_BASE_URL est figé au build du front, cf. webServer.env
  // ci-dessous) : un seul worker évite les conflits de port entre fichiers.
  workers: 1,
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
