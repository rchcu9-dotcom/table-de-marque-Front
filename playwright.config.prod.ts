import { defineConfig } from "@playwright/test";

// URL de prod à viser pour les e2e "réels" (lecture seule)
const prodBaseUrl =
  process.env.E2E_PROD_BASE_URL ?? "https://table-de-marque-72e86.web.app";

export default defineConfig({
  testDir: "tests/e2e-prod",
  timeout: 30_000,
  use: {
    baseURL: prodBaseUrl,
    trace: "on-first-retry",
  },
});
