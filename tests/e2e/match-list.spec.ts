import { test, expect } from "@playwright/test";

test("match list loads (mocked API)", async ({ page }) => {
  await page.route("**/matches", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, home: "A", away: "B" }
      ])
    });
  });

  await page.goto("http://localhost:4173/");

  // Log DOM complet dans la sortie Playwright
  const html = await page.content();
  console.log("=== DOM ===");
  console.log(html);
  console.log("============");

  // Screenshot automatique pour debug CI
  await page.screenshot({ path: "e2e_debug.png", fullPage: true });

  await expect(page.getByText("A vs B")).toBeVisible();
});
