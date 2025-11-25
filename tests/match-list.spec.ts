import { test, expect } from "@playwright/test";

test("match list loads (mocked API)", async ({ page }) => {
  await page.route("**/matches", async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify([
        { id: "1", teamA: "A", teamB: "B", date: "2025-01-01", status: "planned" }
      ]),
      headers: { "Content-Type": "application/json" }
    });
  });

  await page.goto("http://localhost:5173/");
  await expect(page.getByText("A vs B")).toBeVisible();
});
