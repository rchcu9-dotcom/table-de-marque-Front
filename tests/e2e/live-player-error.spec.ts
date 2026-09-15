import { test, expect } from "@playwright/test";

test.describe("Live page fallback UX", () => {
  // La page /live n'affiche jamais de lecteur ni de message d'erreur quand
  // aucun live n'est actif ou que la détection échoue — comportement
  // volontaire ("fallback silencieux"), largement couvert par les tests
  // unitaires src/pages/__tests__/LivePage.test.tsx (ex. "applique un
  // fallback silencieux quand /live/status est en erreur"). Ce spec en
  // vérifie l'équivalent en navigateur réel : ni data-testid `live-iframe`,
  // ni `live-error` ne doivent apparaître, seuls les blocs YouTube/Facebook
  // restent visibles.
  test("n'affiche ni lecteur ni message d'erreur quand aucun live n'est actif (fallback silencieux)", async ({
    page,
  }) => {
    await page.route("**/live/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          isLive: false,
          mode: "fallback",
          fallbackEmbedUrl: "https://www.youtube.com/embed/fallback-id",
          sourceState: "ok",
        }),
      });
    });

    await page.goto("http://localhost:4174/live");

    await expect(page.getByTestId("youtube-channel-link")).toBeVisible();
    await expect(page.getByTestId("live-iframe")).toHaveCount(0);
    await expect(page.getByTestId("live-badge")).toHaveCount(0);
    await expect(page.getByTestId("live-error")).toHaveCount(0);
  });

  test("n'affiche ni lecteur ni message d'erreur quand /live/status echoue", async ({ page }) => {
    await page.route("**/live/status", async (route) => {
      await route.fulfill({ status: 500 });
    });

    await page.goto("http://localhost:4174/live");

    await expect(page.getByTestId("youtube-channel-link")).toBeVisible();
    await expect(page.getByTestId("live-iframe")).toHaveCount(0);
    await expect(page.getByTestId("live-error")).toHaveCount(0);
  });
});
