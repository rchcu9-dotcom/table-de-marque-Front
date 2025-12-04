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
          status: "finished",
          scoreA: 2,
          scoreB: 1
        }
      ])
    });
  });

  await page.route("**/matches/momentum", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "m-live",
          date: "2025-01-01T12:00:00Z",
          teamA: "Live A",
          teamB: "Live B",
          status: "ongoing",
          scoreA: 3,
          scoreB: 2
        }
      ])
    });
  });

  await page.goto("http://localhost:4174/");

  await expect(page.getByTestId("momentum-list")).toBeVisible();
  await expect(page.getByTestId("momentum-match-m-live")).toBeVisible();
  await expect(page.getByTestId("momentum-match-m-live")).toHaveText(/Live A\s*3\s*-\s*2\s*Live B/i);
  await expect(page.getByTestId("match-line-1")).toBeVisible();
  await expect(page.getByTestId("match-line-1")).toHaveText(/A\s*2\s*-\s*1\s*B/i);
});
