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

  // IMPORTANT : plus de page.goto("http://localhost:5173")
  // Playwright ouvre automatiquement la racine du serveur web préconfiguré.
  await page.goto("/");

  await expect(page.getByText("A vs B")).toBeVisible();
});
