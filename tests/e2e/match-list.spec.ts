import { test, expect } from "@playwright/test";

test("match list loads (mocked API)", async ({ page }) => {
  // Mock API
  await page.route("**/matches", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, home: "A", away: "B" }
      ])
    });
  });

  // Navigation vers le serveur lancé par webServer
  await page.goto("http://localhost:4173/");

  await expect(page.getByText("A vs B")).toBeVisible();
});
