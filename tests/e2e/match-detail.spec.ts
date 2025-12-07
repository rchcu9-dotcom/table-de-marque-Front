import { test, expect } from "@playwright/test";

const MATCHES = [
  {
    id: "1",
    date: "2025-01-01T12:00:00Z",
    teamA: "Rennes",
    teamB: "Paris",
    status: "finished",
    scoreA: 2,
    scoreB: 1,
    pouleCode: "A",
    pouleName: "Poule A",
  },
  {
    id: "2",
    date: "2025-01-02T12:00:00Z",
    teamA: "Rennes",
    teamB: "Lille",
    status: "ongoing",
    scoreA: 0,
    scoreB: 2,
    pouleCode: "A",
    pouleName: "Poule A",
  },
  {
    id: "3",
    date: "2025-01-03T12:00:00Z",
    teamA: "Rennes",
    teamB: "Lyon",
    status: "finished",
    scoreA: 1,
    scoreB: 1,
    pouleCode: "A",
    pouleName: "Poule A",
  },
  {
    id: "4",
    date: "2025-01-04T12:00:00Z",
    teamA: "Paris",
    teamB: "Nice",
    status: "finished",
    scoreA: 4,
    scoreB: 0,
    pouleCode: "A",
    pouleName: "Poule A",
  },
];

const CLASSEMENT = {
  pouleCode: "A",
  pouleName: "Poule A",
  equipes: [],
};

async function mockApis(page) {
  await page.addInitScript(
    ({ matches, classement }) => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();

        if (/\/matches\/[^/]+\/classement$/.test(url)) {
          return new Response(JSON.stringify(classement), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (/\/matches\/[^/]+$/.test(url)) {
          const id = url.split("/").pop();
          const match = matches.find((m: any) => m.id === id);
          if (match) {
            return new Response(JSON.stringify(match), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(null, { status: 404 });
        }

        if (/\/matches$/.test(url)) {
          return new Response(JSON.stringify(matches), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return originalFetch(input, init);
      };
    },
    { matches: MATCHES, classement: CLASSEMENT },
  );

  await page.route("**/matches", async (route) => {
    if (route.request().resourceType() === "document") {
      return route.continue();
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MATCHES),
    });
  });

  await page.route(/.*\/matches\/[^/]+\/classement$/, async (route) => {
    if (route.request().resourceType() === "document") {
      return route.continue();
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(CLASSEMENT),
    });
  });

  await page.route(/.*\/matches\/[^/]+$/, async (route, request) => {
    if (route.request().resourceType() === "document") {
      return route.continue();
    }
    const id = request.url().split("/").pop();
    const match = MATCHES.find((m) => m.id === id);
    if (!match) {
      return route.fulfill({ status: 404 });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(match),
    });
  });
}

test.describe("Match detail - résumés et slider", () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page);
  });

  test("affiche les grilles résumé avec couleurs de contour et navigation", async ({ page }) => {
    await page.goto("http://localhost:4174/matches/1");

    await expect(page.getByTestId("summary-grid-teamA")).toBeVisible();
    await expect(page.getByTestId("summary-grid-teamB")).toBeVisible();
    await expect(page.getByTestId("classement-section")).toBeVisible();
    await expect(page.getByTestId("summary-grid-teamA").getByTestId("summary-card-1")).toHaveClass(
      /border-sky-400/,
    );

    const teamAScoreWin = page
      .getByTestId("summary-grid-teamA")
      .getByTestId("summary-score-1");
    const teamAScoreLose = page
      .getByTestId("summary-grid-teamA")
      .getByTestId("summary-score-2");
    const teamAScoreDraw = page
      .getByTestId("summary-grid-teamA")
      .getByTestId("summary-score-3");

    await expect(teamAScoreWin).toHaveClass(/border-emerald-400/);
    await expect(teamAScoreLose).toHaveClass(/border-rose-400/);
    await expect(teamAScoreDraw).toHaveClass(/border-slate-600/);

    const teamBScoreLoss = page
      .getByTestId("summary-grid-teamB")
      .getByTestId("summary-score-1");
    const teamBScoreWin = page
      .getByTestId("summary-grid-teamB")
      .getByTestId("summary-score-4");
    await expect(teamBScoreLoss).toHaveClass(/border-rose-400/);
    await expect(teamBScoreWin).toHaveClass(/border-emerald-400/);

    await page
      .getByTestId("summary-grid-teamA")
      .getByTestId("summary-card-2")
      .click();
    await expect(page).toHaveURL(/\/matches\/2$/);
    const scoreArea = page.getByTestId("match-score");
    await expect(scoreArea).toContainText("Rennes");
    await expect(scoreArea).toContainText("Lille");
  });

  test("slider poule centré sur le match courant et navigation via clic", async ({ page }) => {
    await page.goto("http://localhost:4174/matches/1");

    const currentCard = page.getByTestId("poule-slider-card-1");
    await expect(page.getByTestId("poule-slider")).toBeVisible();
    await expect(currentCard).toHaveClass(/border-sky-400/);

    const targetCard = page.getByTestId("poule-slider-card-4");
    await targetCard.scrollIntoViewIfNeeded();
    await targetCard.click();

    await expect(page).toHaveURL(/\/matches\/4$/);
    await expect(page.getByTestId("poule-slider-card-4")).toHaveClass(/border-sky-400/);
  });
  test("liserets de sélection reflètent le statut (ongoing amber)", async ({ page }) => {
    await page.goto("http://localhost:4174/matches/2");

    const summaryCard = page.getByTestId("summary-grid-teamA").getByTestId("summary-card-2");
    await expect(summaryCard).toHaveClass(/border-amber-300/);

    const sliderCard = page.getByTestId("poule-slider-card-2");
    await expect(sliderCard).toHaveClass(/border-amber-300/);
  });
});
