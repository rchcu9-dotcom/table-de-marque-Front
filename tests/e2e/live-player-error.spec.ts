import { test, expect } from "@playwright/test";

test.describe("Live page player error fallback UX", () => {
  test("affiche indisponibilite + retry, puis retry recharge le player", async ({ page }) => {
    let statusCalls = 0;

    await page.route("**/live/status", async (route) => {
      statusCalls += 1;
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

    const iframe = page.getByTestId("live-iframe");
    await expect(iframe).toBeVisible();

    await page.evaluate(() => {
      const player = document.querySelector("[data-testid='live-iframe']") as
        | HTMLIFrameElement
        | null;
      if (!player) {
        throw new Error("live iframe not found");
      }

      const reactPropsKey = Object.keys(player).find((key) =>
        key.startsWith("__reactProps"),
      );
      const reactProps = reactPropsKey
        ? (player as unknown as Record<string, { onError?: (evt: Event) => void }>)[
            reactPropsKey
          ]
        : null;

      if (reactProps?.onError) {
        reactProps.onError(new Event("error"));
        return;
      }

      player.dispatchEvent(new Event("error"));
    });

    await expect(page.getByTestId("live-error")).toBeVisible();
    await expect(page.getByText(/Video indisponible, reessayez plus tard\./i)).toBeVisible();

    const retry = page.getByTestId("live-retry");
    await expect(retry).toBeVisible();
    await retry.click();

    await expect(page.getByTestId("live-iframe")).toBeVisible();
    await expect(page.getByTestId("live-error")).toHaveCount(0);
    expect(statusCalls).toBeGreaterThanOrEqual(2);
  });
});
