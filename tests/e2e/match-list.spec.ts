import { test, expect } from "@playwright/test";

test("match list loads (mocked API)", async ({ page }) => {
  await page.route("**/matches", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "1",
          date: "2025-01-01T12:00:00Z",
          teamA: "A",
          teamB: "B",
          status: "planned"
        }
      ])
    });
  });

  await page.goto("http://localhost:4173/");

  await expect(page.getByText("A vs B")).toBeVisible();
});
