import { test, expect } from "@playwright/test";
import { startMockBack } from "../mocks/mock-back";

const MOCK_PORT = 4000;

test.describe("SSE live update with mock backend", () => {
  let mockHandle: { close: () => Promise<void> } | null = null;

  test.beforeAll(async () => {
    mockHandle = await startMockBack(MOCK_PORT);
  });

  test.afterAll(async () => {
    if (mockHandle) await mockHandle.close();
  });

  test("met à jour le score sans reload", async ({ page }) => {
    // La page "/" affiche désormais le hero momentum (HomePage), qui ne rend
    // pas de data-testid `match-line-N` — ce test vérifie la mise à jour SSE
    // sur la liste des matchs (/matches), où cette testid existe réellement.
    // MatchStreamListener est monté globalement (main.tsx), l'écoute SSE
    // fonctionne donc sur n'importe quelle route.
    await page.goto("/matches");

    // attendre que le fetch initial soit revenu
    await page.waitForResponse(/\/matches$/);

    const line = page.getByTestId("match-line-1");
    await expect(line).toContainText("Mock A", { timeout: 5000 });
    await expect(line).toContainText("Mock B", { timeout: 5000 });
    // attend le but poussé par SSE
    await expect(line).toContainText("1-0", { timeout: 10000 });
  });
});
