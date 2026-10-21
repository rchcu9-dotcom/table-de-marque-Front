import { test, expect, type Page } from "@playwright/test";
import { startMockBack, type MockBackHandle } from "../mocks/mock-back";
import {
  CHAPTER_IMAGE_PATH,
  EDITION_COMPLETE,
  buildTournoiInfosGroupes,
  makeArticle,
} from "../fixtures/tournoiInfos.fixture";

const MOCK_PORT = 4000;

// Édition partagée (midi UTC) ; le mock remplace son `etape` par `editionEtape`.
const EDITION = EDITION_COMPLETE;

const GROUPES = buildTournoiInfosGroupes(CHAPTER_IMAGE_PATH);

async function gotoInfos(page: Page, url = "/tournoi/infos") {
  await page.goto(url);
  await expect(page.getByTestId("tournoi-infos-page")).toBeVisible();
  await expect(page.getByTestId("tournoi-infos-chapter-Présentation")).toBeVisible();
}

function withMockBack(editionEtape: string | null, edition: Record<string, unknown> | undefined = EDITION) {
  let mock: MockBackHandle | null = null;
  test.beforeAll(async () => {
    mock = await startMockBack(MOCK_PORT, { editionEtape, edition, presentationGroupes: GROUPES });
  });
  test.afterAll(async () => {
    if (mock) await mock.close();
  });
}

test.describe("/tournoi/infos — inscriptions ouvertes", () => {
  withMockBack("INSCRIPTIONS_OUVERTES");

  test("E1 · « En savoir plus » du Résumé sur / ouvre /tournoi/infos dans le même onglet et la même langue (CA1)", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    const chapter = page.getByTestId("presentation-chapter-Présentation");
    await expect(chapter).toBeVisible();
    // Sous-écran Résumé figé (un clic sur le segment suspend l'avance auto).
    await chapter.getByRole("tab").nth(0).click();
    await page.getByTestId("presentation-language-en").click();

    const cta = page.getByTestId("presentation-subtheme-Résumé").getByTestId("presentation-subtheme-cta");
    await expect(cta).toHaveAttribute("href", "/tournoi/infos?lang=en");
    await expect(cta).not.toHaveAttribute("target", /.+/);

    const pagesAvant = context.pages().length;
    await cta.click();

    await expect(page).toHaveURL(/\/tournoi\/infos\?lang=en$/);
    expect(context.pages()).toHaveLength(pagesAvant);
    await expect(page.getByRole("heading", { level: 2, name: "Presentation" })).toBeVisible();
  });

  test("E2 · affiche les chapitres hors Médias, sans YouTube, avec textes longs, faits et tokens (CA2)", async ({
    page,
  }) => {
    await gotoInfos(page);

    await expect(page.getByRole("heading", { level: 1, name: "Tournoi RCHC U11" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Présentation", "Tournoi 5v5"]);
    await expect(page.getByTestId("tournoi-infos-chapter-Médias")).toHaveCount(0);
    await expect(page.getByText("Suivez le live.")).toHaveCount(0);

    const resume = page.getByTestId("tournoi-infos-article-Résumé");
    await expect(resume.getByText("Deux jours de glace à Rennes.")).toBeVisible();
    await expect(resume.getByText("Le tournoi a lieu les 22 mai - 23 mai.")).toBeVisible();
    await expect(resume.getByText("Inscription : 270 € par équipe.")).toBeVisible();
    await expect(resume.getByTestId("tournoi-infos-facts")).toBeVisible();
    // Pas de lien du Résumé vers la page elle-même.
    await expect(resume.getByTestId("tournoi-infos-article-link")).toHaveCount(0);

    // Annexe tests E1 : rien du chapitre Médias ni de l'article YouTube (filtrés), même en texte.
    await expect(page.getByTestId("tournoi-infos-page")).not.toContainText(/instagram|youtube/i);
    await expect(page.getByText("Galerie photos du tournoi.")).toHaveCount(0);

    // CA3b : édition courante complète → aucun token brut, en FR comme en EN.
    await expect(page.getByTestId("tournoi-infos-page")).not.toContainText("{{");
    await gotoInfos(page, "/tournoi/infos?lang=en");
    await expect(page.getByText("Two days on ice in Rennes.")).toBeVisible();
    await expect(page.getByTestId("tournoi-infos-page")).not.toContainText("{{");
  });

  test("E3 · images de chapitre visibles à l'écran, absentes de l'aperçu d'impression (CA3)", async ({ page }) => {
    await page.emulateMedia({ media: "screen" });
    await gotoInfos(page);

    const images = page.getByTestId("chapter-image");
    await expect(images).toHaveCount(2);
    await expect(images.first()).toBeVisible();

    await page.emulateMedia({ media: "print" });
    const toutes = page.locator("img");
    const total = await toutes.count();
    expect(total).toBeGreaterThan(0);
    for (let i = 0; i < total; i++) {
      await expect(toutes.nth(i)).toBeHidden();
    }
  });

  test("E7b · en print, le lien externe reste lisible par son domaine, sans URL dupliquée en ::after (annexe tests E7 adaptée)", async ({
    page,
  }) => {
    await gotoInfos(page);
    await page.emulateMedia({ media: "print" });

    const blizz = page.getByTestId("tournoi-infos-article-Le Blizz").getByTestId("tournoi-infos-article-link");
    await expect(blizz).toBeVisible();
    await expect(blizz).toHaveText("www.leblizz.com");
    await expect(blizz).toHaveAttribute("href", "https://www.leblizz.com");
    await expect(blizz).toHaveCSS("color", "rgb(0, 0, 0)");
    // Arbitrage arch : opt-in data-print-url ; le libellé étant déjà le domaine, aucune URL n'est ajoutée.
    const after = await blizz.evaluate((a) => getComputedStyle(a, "::after").content);
    expect(after).toMatch(/^(none|normal)$/);
    // Le lien Google Maps n'imprime pas non plus son URL.
    const carte = page.getByTestId("tournoi-infos-article-Le Blizz").getByTestId("presentation-maps-link");
    expect(await carte.evaluate((a) => getComputedStyle(a, "::after").content)).toMatch(/^(none|normal)$/);
  });

  test("E4 · section lieu : adresse, « Voir sur la carte » et lien Blizz, en nouvel onglet (CA4, CA8)", async ({
    page,
  }) => {
    await gotoInfos(page);

    const lieu = page.getByTestId("tournoi-infos-article-Le Blizz");
    await expect(lieu.getByText("Le Blizz, Rennes")).toBeVisible();

    const carte = lieu.getByTestId("presentation-maps-link");
    await expect(carte).toHaveText("Voir sur la carte");
    await expect(carte).toHaveAttribute("target", "_blank");
    await expect(carte).toHaveAttribute("href", /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);

    const blizz = lieu.getByTestId("tournoi-infos-article-link");
    await expect(blizz).toHaveText("www.leblizz.com");
    await expect(blizz).toHaveAttribute("href", "https://www.leblizz.com");
    await expect(blizz).toHaveAttribute("target", "_blank");
    await expect(blizz).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("E5 · le bouton PDF appelle window.print() ; l'aperçu n'a ni navigation ni boutons, texte noir sur blanc (CA5)", async ({
    page,
  }) => {
    await gotoInfos(page);
    await page.evaluate(() => {
      (window as unknown as { __printCalls: number }).__printCalls = 0;
      window.print = () => {
        (window as unknown as { __printCalls: number }).__printCalls += 1;
      };
    });

    const bouton = page.getByTestId("tournoi-infos-pdf");
    await expect(bouton).toHaveText("Télécharger en PDF");
    await bouton.click();
    expect(await page.evaluate(() => (window as unknown as { __printCalls: number }).__printCalls)).toBe(1);

    await page.emulateMedia({ media: "print" });

    await expect(page.getByTestId("presentation-language-toggle")).toBeHidden();
    await expect(bouton).toBeHidden();
    await expect(page.getByTestId("tournoi-infos-pdf-help")).toBeHidden();
    for (const nav of await page.locator("nav").all()) {
      await expect(nav).toBeHidden();
    }
    for (const button of await page.locator("button").all()) {
      await expect(button).toBeHidden();
    }
    await expect(page.locator("div.sticky.top-0").first()).toBeHidden();

    const h2 = page.getByRole("heading", { level: 2, name: "Présentation" });
    await expect(h2).toBeVisible();
    await expect(h2).toHaveCSS("color", "rgb(0, 0, 0)");
    await expect(page.getByText("Patinoire olympique.")).toHaveCSS("color", "rgb(0, 0, 0)");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.getByTestId("tournoi-infos-print-footer")).toBeVisible();
  });

  test("E5b · titre du document explicite, restauré en quittant la page (CA5b)", async ({ page }) => {
    await gotoInfos(page);
    await expect(page).toHaveTitle("Tournoi RCHC U11 – Informations 2027");

    await page.goto("/tournoi/infos?lang=en");
    await expect(page).toHaveTitle("Tournoi RCHC U11 – Information 2027");
  });

  test("E6c · le toggle de langue ne crée pas d'entrée d'historique : goBack ramène à la page précédente (annexe tests E3)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("presentation-page")).toBeVisible();
    await gotoInfos(page, "/tournoi/infos?lang=en");

    await page.getByTestId("presentation-language-fr").click();
    await expect(page).toHaveURL(/\/tournoi\/infos\?lang=fr$/);
    await page.getByTestId("presentation-language-en").click();
    await expect(page).toHaveURL(/\/tournoi\/infos\?lang=en$/);

    await page.goBack();
    // Retour à l'accueil, et non à /tournoi/infos?lang=fr : les clics sur le toggle ont remplacé l'entrée.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("presentation-page")).toBeVisible();
  });

  test("E6 · ?lang=en affiche l'anglais avec repli FR ; le toggle garde la langue au rechargement (CA6)", async ({
    page,
  }) => {
    await gotoInfos(page, "/tournoi/infos?lang=en");

    await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Presentation", "Tournoi 5v5"]);
    await expect(page.getByText("Two days on ice in Rennes.")).toBeVisible();
    await expect(page.getByText("Inscrivez votre équipe en ligne.")).toBeVisible();
    await expect(page.getByTestId("presentation-maps-link")).toHaveText("View on map");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.getByTestId("presentation-language-fr").click();
    await expect(page).toHaveURL(/\/tournoi\/infos\?lang=fr$/);
    await expect(page.getByRole("heading", { level: 2, name: "Présentation" })).toBeVisible();

    await page.getByTestId("presentation-language-en").click();
    await page.reload();
    await expect(page).toHaveURL(/lang=en/);
    await expect(page.getByRole("heading", { level: 2, name: "Presentation" })).toBeVisible();
  });

  test("E6b · ?lang=xx donne le français", async ({ page }) => {
    await gotoInfos(page, "/tournoi/infos?lang=xx");
    await expect(page.getByRole("heading", { level: 2, name: "Présentation" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test("E7 · accès direct et rechargement ; / garde la présentation (CA7)", async ({ page }) => {
    await gotoInfos(page);
    await page.reload();
    await expect(page.getByTestId("tournoi-infos-chapter-Présentation")).toBeVisible();

    await page.goto("/");
    await expect(page.getByTestId("presentation-page")).toBeVisible();
  });
});

test.describe("/tournoi/infos — tournoi démarré (CA7)", () => {
  withMockBack("TOURNOI_DEMARRE");

  test("E7b · la page s'affiche en accès direct, / reste la HomePage", async ({ page }) => {
    await gotoInfos(page);
    await expect(page.getByRole("heading", { level: 1, name: "Tournoi RCHC U11" })).toBeVisible();

    await page.goto("/");
    await expect(page.getByTestId("home-page")).toBeVisible();
  });
});

test.describe("/tournoi/infos — filet « Site du lieu » quand le lienUrl du porteur du lieu est pris (spec de saisie CA2)", () => {
  // Cas réel K1 : le Résumé porte le lieu ET pointe vers /tournoi/infos. Variante de la
  // fixture partagée, sans la modifier en place.
  const groupes = buildTournoiInfosGroupes().map((groupe) => ({
    ...groupe,
    articles: groupe.articles
      .filter((article) => article.titre !== "Le Blizz")
      .map((article) =>
        article.titre === "Résumé"
          ? { ...article, lieu: "Patinoire du Blizz, Rennes", mapsQuery: "Le Blizz Rennes" }
          : article,
      ),
  }));

  let mock: MockBackHandle | null = null;
  test.beforeAll(async () => {
    mock = await startMockBack(MOCK_PORT, {
      editionEtape: "INSCRIPTIONS_OUVERTES",
      edition: EDITION,
      presentationGroupes: groupes,
    });
  });
  test.afterAll(async () => {
    if (mock) await mock.close();
  });

  test("E4b · le Blizz s'affiche quand même, via VITE_TOURNOI_LIEU_URL, en nouvel onglet", async ({ page }) => {
    await gotoInfos(page);

    const resume = page.getByTestId("tournoi-infos-article-Résumé");
    // Auto-lien vers la page : omis.
    await expect(resume.getByTestId("tournoi-infos-article-link")).toHaveCount(0);

    const filet = resume.getByTestId("tournoi-infos-lieu-site");
    await expect(filet).toHaveText(/^Site du lieu\s:\swww\.leblizz\.com$/);
    const lien = filet.getByTestId("tournoi-infos-lieu-url");
    await expect(lien).toHaveAttribute("href", "https://www.leblizz.com");
    await expect(lien).toHaveAttribute("target", "_blank");
    await expect(lien).toHaveAttribute("rel", "noopener noreferrer");

    await page.goto("/tournoi/infos?lang=en");
    await expect(page.getByTestId("tournoi-infos-lieu-site")).toHaveText(/^Venue website:\swww\.leblizz\.com$/);

    // Toujours lisible à l'impression.
    await page.emulateMedia({ media: "print" });
    await expect(page.getByTestId("tournoi-infos-lieu-site")).toBeVisible();
  });
});

test.describe("/tournoi/infos — aucune édition courante (CA7, R1)", () => {
  withMockBack(null);

  test("E7c · la page s'affiche, tokens d'édition laissés bruts sans plantage", async ({ page }) => {
    await gotoInfos(page);

    await expect(page.getByRole("heading", { level: 1, name: "Tournoi U11 RCHC" })).toBeVisible();
    await expect(page.getByText("Le tournoi a lieu les {{dates}}.")).toBeVisible();
    await expect(page).toHaveTitle("Tournoi U11 RCHC – Informations");
  });
});

test.describe("/tournoi/infos — édition en préparation (spec consolidée CA7, annexe tests E2)", () => {
  withMockBack("CREATION_NOUVEAU_TOURNOI");

  test("E2b · accès direct et rechargement en CREATION_NOUVEAU_TOURNOI ; / reste la HomePage", async ({ page }) => {
    await gotoInfos(page);
    await page.reload();
    await expect(page.getByTestId("tournoi-infos-page")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Présentation", "Tournoi 5v5"]);

    await page.goto("/");
    await expect(page.getByTestId("home-page")).toBeVisible();
    await expect(page.getByTestId("presentation-page")).toHaveCount(0);
  });
});

test.describe("/tournoi/infos — lien du lieu saisi « Http:// » (spec consolidée CA8, annexe tests E5)", () => {
  // Contenu réel du seed : schéma « Http » avec une majuscule.
  const groupes = buildTournoiInfosGroupes().map((groupe) => ({
    ...groupe,
    articles: groupe.articles.map((article) =>
      article.titre === "Le Blizz" ? { ...article, lienUrl: "Http://www.leblizz.com" } : article,
    ),
  }));
  // Annexe tests E5 : un lienUrl en javascript: ne doit produire aucun lien.
  groupes[1] = {
    ...groupes[1],
    articles: [
      ...groupes[1].articles,
      makeArticle({ titre: "Piège", description: "Article au lien dangereux.", lienUrl: "javascript:alert(1)" }),
    ],
  };

  let mock: MockBackHandle | null = null;
  test.beforeAll(async () => {
    mock = await startMockBack(MOCK_PORT, {
      editionEtape: "INSCRIPTIONS_OUVERTES",
      edition: EDITION,
      presentationGroupes: groupes,
    });
  });
  test.afterAll(async () => {
    if (mock) await mock.close();
  });

  test("E5c · un lienUrl javascript: ne produit aucun lien (annexe tests E5, CA8)", async ({ page }) => {
    await gotoInfos(page);

    const piege = page.getByTestId("tournoi-infos-article-Piège");
    await expect(piege).toBeVisible();
    await expect(piege.getByText("Article au lien dangereux.")).toBeVisible();
    await expect(piege.locator("a")).toHaveCount(0);
    await expect(page.locator('a[href^="javascript:" i]')).toHaveCount(0);
  });

  test("E5b · href exactement tel que saisi, nouvel onglet, sans requête vers Internet", async ({ page, context }) => {
    const appelsBlizz: string[] = [];
    await context.route(
      (url) => url.hostname.endsWith("leblizz.com"),
      (route) => {
        appelsBlizz.push(route.request().url());
        return route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: "<p>site du Blizz (simulé)</p>",
        });
      },
    );

    await gotoInfos(page);
    const lieu = page.getByTestId("tournoi-infos-article-Le Blizz");
    const lien = lieu.getByTestId("tournoi-infos-article-link");

    await expect(lien).toHaveAttribute("href", "Http://www.leblizz.com");
    await expect(lien).toHaveAttribute("target", "_blank");
    await expect(lien).toHaveAttribute("rel", "noopener noreferrer");
    await expect(lien).toHaveText("www.leblizz.com");
    // Même hôte que VITE_TOURNOI_LIEU_URL : pas de filet en doublon.
    await expect(lieu.getByTestId("tournoi-infos-lieu-site")).toHaveCount(0);

    const [popup] = await Promise.all([context.waitForEvent("page"), lien.click()]);
    await popup.waitForLoadState();

    expect(popup.url()).toMatch(/^http:\/\/www\.leblizz\.com\/?$/);
    await expect(popup.getByText("site du Blizz (simulé)")).toBeVisible();
    expect(appelsBlizz.length).toBeGreaterThan(0);
    await expect(page).toHaveURL(/\/tournoi\/infos$/);
  });
});
