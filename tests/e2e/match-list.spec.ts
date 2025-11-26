import { test, expect } from "@playwright/test";

test("match list loads (mocked API)", async ({ page }) => {

  // Log toutes les requêtes
  page.on("request", (req) => {
    console.log("REQUEST →", req.method(), req.url());
  });

  // Log toutes les réponses
  page.on("response", (res) => {
    console.log("RESPONSE ←", res.status(), res.url());
  });

  // Mock générique pour tout voir passer
  await page.route("**", async (route) => {
    const url = route.request().url();

    if (url.includes("/matches")) {
      console.log("MOCKED →", url);

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: 1, home: "A", away: "B" }
        ])
      });
    }

    return route.continue();
  });

  await page.goto("http://localhost:4173/");

  // Affiche le DOM pour debug
  console.log("=== DOM AFTER LOAD ===");
  console.log(await page.content());
  console.log("======================");

  await expect(page.getByText("A vs B")).toBeVisible();
});
