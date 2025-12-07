import { test, expect } from "@playwright/test";

const MATCHES = [
  {
    id: "1",
    date: "2025-01-01T08:00:00Z",
    teamA: "A",
    teamB: "B",
    status: "finished",
    scoreA: 2,
    scoreB: 1,
  },
  {
    id: "2",
    date: "2025-01-01T09:00:00Z",
    teamA: "C",
    teamB: "D",
    status: "ongoing",
    scoreA: 1,
    scoreB: 1,
  },
  {
    id: "3",
    date: "2025-01-01T10:00:00Z",
    teamA: "E",
    teamB: "F",
    status: "planned",
    scoreA: null,
    scoreB: null,
  },
  {
    id: "4",
    date: "2025-01-01T07:00:00Z",
    teamA: "G",
    teamB: "H",
    status: "planned",
    scoreA: null,
    scoreB: null,
  },
];

test.describe("Match list", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/matches", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MATCHES),
      });
    });
  });

  test("affiche momentum et planning avec bons liserets et filtres", async ({ page }) => {
    await page.goto("http://localhost:4174/");

    await expect(page.getByTestId("momentum-list")).toBeVisible();
    await expect(page.getByTestId("planning-list")).toBeVisible();

    const momentumItems = page.getByTestId(/momentum-match-/);
    await expect(momentumItems).toHaveCount(3);
    // Ordre attendu : id3 (planned), id2 (ongoing), id1 (finished) - tri date décroissant
    const ids = await momentumItems.evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-testid")),
    );
    expect(ids).toEqual(["momentum-match-3", "momentum-match-2", "momentum-match-1"]);

    const classes = await momentumItems.evaluateAll((nodes) =>
      nodes.map(
        (el) => ((el.closest(".rounded-2xl") as HTMLElement | null)?.className ?? "").toString(),
      ),
    );
    expect(classes[0]).toMatch(/border-slate-600/); // planned
    expect(classes[1]).toMatch(/border-amber-300/); // ongoing
    expect(classes[1]).toMatch(/live-pulse-card/);
    expect(classes[2]).toMatch(/border-sky-400/); // finished

    const selects = page.locator("select");
    await expect(selects.nth(0)).toContainText(/Les equipes/i);
    await expect(selects.nth(1)).toContainText(/Les poules/i);
  });
});
