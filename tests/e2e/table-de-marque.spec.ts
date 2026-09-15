/**
 * E2E — Table de marque (parcours visiteur)
 *
 * Stratégie : réseau entièrement mocké via page.addInitScript (fetch override)
 * + page.route (pour les requêtes XHR/fetch non couvertes par initScript).
 * Aucune connexion réelle au backend.
 *
 * Choix d'architecture de test :
 * - Le parcours opérateur (PLANIFIE→ANNONCE→EN_COURS→EN_PAUSE→TERMINE) nécessite
 *   Firebase Authentication pour les routes POST protégées. Comme Firebase est un
 *   système externe non maquettable simplement en Playwright statique, le parcours
 *   opérateur interactif n'est pas couvert ici.
 * - Les mises à jour SSE sont couvertes par le test Vitest MatchStreamListener.matchlive.
 * - Ce spec couvre le parcours VISITEUR : affichage du ScoreBoard sur MatchDetailPage
 *   quand l'état du match live n'est pas PLANIFIE (critère d'acceptation §6 :
 *   "toute action opérateur est visible côté visiteur").
 */

import { test, expect } from "@playwright/test";

const NUM_MATCH = 1;
const BASE_URL = "http://localhost:4174";

const MATCH = {
  id: String(NUM_MATCH),
  date: "2026-09-04T10:00:00.000Z",
  teamA: "Rennes",
  teamB: "Paris",
  status: "ongoing",
  scoreA: 1,
  scoreB: 0,
  pouleCode: "A",
  pouleName: "Poule A",
  competitionType: "5v5",
};

const CLASSEMENT = {
  pouleCode: "A",
  pouleName: "Poule A",
  equipes: [],
};

function makeLiveDetail(overrides: {
  etat?: string;
  score1Cache?: number;
  score2Cache?: number;
  tempsEcouleSecondes?: number;
  chronoEnCours?: boolean;
} = {}) {
  return {
    matchLive: {
      numMatch: NUM_MATCH,
      etat: overrides.etat ?? "EN_COURS",
      tempsEcouleSecondes: overrides.tempsEcouleSecondes ?? 300,
      chronoEnCours: overrides.chronoEnCours ?? true,
      chronoDerniereMajAt: "2026-09-04T10:05:00.000Z",
      score1Cache: overrides.score1Cache ?? 1,
      score2Cache: overrides.score2Cache ?? 0,
      createdAt: "2026-09-04T10:00:00.000Z",
      updatedAt: "2026-09-04T10:05:00.000Z",
    },
    buts: [],
    penalites: [],
  };
}

async function mockApis(
  page: Parameters<Parameters<typeof test>[1]>[0]["page"],
  liveDetail: ReturnType<typeof makeLiveDetail>,
) {
  const matches = [MATCH];
  const classement = CLASSEMENT;

  await page.addInitScript(
    ({ matches, classement, liveDetail, numMatch }) => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();

        if (/\/table-de-marque\/matches\/\d+\/live$/.test(url)) {
          return new Response(JSON.stringify(liveDetail), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (/\/table-de-marque\/matches\/\d+\/effectifs$/.test(url)) {
          return new Response(
            JSON.stringify({
              equipe1: { equipeId: 1, nom: "Rennes", joueurs: [], coachs: [] },
              equipe2: { equipeId: 2, nom: "Paris", joueurs: [], coachs: [] },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        if (/\/matches\/[^/]+\/classement$/.test(url)) {
          return new Response(JSON.stringify(classement), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (new RegExp(`/matches/${numMatch}$`).test(url)) {
          return new Response(JSON.stringify(matches[0]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (/\/matches$/.test(url)) {
          return new Response(JSON.stringify(matches), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (/\/partenaire$/.test(url)) {
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (/\/classement/.test(url)) {
          return new Response(JSON.stringify(classement), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Bloquer les SSE (EventSource ne passe pas par fetch, mais au cas où)
        return originalFetch(input, init);
      };
    },
    { matches, classement, liveDetail, numMatch: NUM_MATCH },
  );

  // Couvrir aussi les requêtes non-fetch (EventSource → bloquer proprement)
  await page.route("**/matches/stream", (route) => route.abort());
  await page.route(/.*\/table-de-marque\/matches\/\d+\/live$/, async (route) => {
    if (route.request().resourceType() === "document") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(liveDetail),
    });
  });
  await page.route(/.*\/matches\/\d+$/, async (route, request) => {
    if (route.request().resourceType() === "document") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MATCH),
    });
  });
  await page.route(/.*\/matches$/, async (route) => {
    if (route.request().resourceType() === "document") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([MATCH]),
    });
  });
}

test.describe("Table de marque — parcours visiteur", () => {
  test("affiche le ScoreBoard en direct quand l'état est EN_COURS", async ({ page }) => {
    await mockApis(page, makeLiveDetail({ etat: "EN_COURS", score1Cache: 1, score2Cache: 0 }));
    await page.goto(`${BASE_URL}/matches/${NUM_MATCH}`);

    await expect(page.getByText("Score en direct")).toBeVisible({ timeout: 10000 });
    // Le badge ScoreBoard "En cours" a la classe text-emerald-300 (distinct du badge match status)
    await expect(page.locator(".text-emerald-300").filter({ hasText: "En cours" })).toBeVisible();
    // Vérifier le score dans la zone ScoreBoard (score1Cache - score2Cache)
    await expect(page.getByTestId("match-live-score")).toContainText("1");
    await expect(page.getByTestId("match-live-score")).toContainText("0");
  });

  test("n'affiche pas le ScoreBoard quand l'état est PLANIFIE", async ({ page }) => {
    await mockApis(page, makeLiveDetail({ etat: "PLANIFIE" }));
    await page.goto(`${BASE_URL}/matches/${NUM_MATCH}`);

    await expect(page.getByTestId("match-score")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Score en direct")).not.toBeVisible();
  });

  test("affiche l'état ANNONCE avec les noms d'équipe dans le ScoreBoard", async ({ page }) => {
    await mockApis(page, makeLiveDetail({ etat: "ANNONCE", score1Cache: 0, score2Cache: 0, chronoEnCours: false }));
    await page.goto(`${BASE_URL}/matches/${NUM_MATCH}`);

    await expect(page.getByText("Score en direct")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Annoncé")).toBeVisible();
    await expect(page.getByText("Rennes").first()).toBeVisible();
    await expect(page.getByText("Paris").first()).toBeVisible();
  });

  test("affiche l'état TERMINE avec le score figé dans le ScoreBoard", async ({ page }) => {
    await mockApis(page, makeLiveDetail({ etat: "TERMINE", score1Cache: 2, score2Cache: 1, chronoEnCours: false }));
    await page.goto(`${BASE_URL}/matches/${NUM_MATCH}`);

    await expect(page.getByText("Score en direct")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Terminé").first()).toBeVisible();
    await expect(page.getByText(/2.*-.*1/)).toBeVisible();
  });

  test("affiche l'état EN_PAUSE sans erreur", async ({ page }) => {
    await mockApis(page, makeLiveDetail({ etat: "EN_PAUSE", score1Cache: 1, score2Cache: 1, chronoEnCours: false }));
    await page.goto(`${BASE_URL}/matches/${NUM_MATCH}`);

    await expect(page.getByText("Score en direct")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Pause")).toBeVisible();
  });
});
