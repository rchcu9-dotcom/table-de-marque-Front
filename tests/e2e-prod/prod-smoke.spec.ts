import { test, expect } from "@playwright/test";

const HOST_BLOCK = "localhost";

test.setTimeout(45_000);

test.describe("Smoke prod (lecture seule)", () => {
  test("homepage utilise l'API prod et rend les listes", async ({ page }) => {
    const apiCalls: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/matches")) apiCalls.push(req.url());
    });

    await page.goto("/");

    const resp = await page.waitForResponse(
      (res) => res.url().includes("/matches") && res.status() === 200,
      { timeout: 30_000 },
    );
    expect(resp.url()).not.toContain(HOST_BLOCK);
    expect(apiCalls.some((u) => u.includes("/matches"))).toBeTruthy();

    const anyMatch = page.locator('[data-testid^="match-line-"], [data-testid^="momentum-match-"]');
    await anyMatch.first().waitFor({ state: "visible", timeout: 30_000 });
    await expect(page.getByTestId("momentum-list")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("planning-list")).toBeVisible({ timeout: 30_000 });
  });

  test("navigation vers un détail match et appels non-localhost", async ({ page }) => {
    const apiCalls: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/matches")) apiCalls.push(req.url());
    });

    await page.goto("/");

    const firstMatch = page.locator('[data-testid^="match-line-"]').first();
    await firstMatch.waitFor({ state: "visible", timeout: 30_000 });
    await firstMatch.click();
    await page.waitForURL(/\/matches\//, { timeout: 30_000 });

    const detailResp = await page.waitForResponse(
      (res) => res.url().includes("/matches/") && res.status() === 200,
      { timeout: 30_000 },
    );

    expect(detailResp.url()).not.toContain(HOST_BLOCK);
    expect(apiCalls.every((u) => !u.includes(HOST_BLOCK))).toBeTruthy();

    await expect(page.getByTestId("match-score")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("classement-section")).toBeVisible({ timeout: 30_000 });
  });
});
