import { test, expect, type Page } from "@playwright/test";
import { startMockBack, type MockBackHandle } from "../mocks/mock-back";
import { makeArticle, makeGroupe } from "../fixtures/tournoiInfos.fixture";

/**
 * Refac « liens internes » : `?lang` n'est ajouté qu'aux chemins /tournoi et /tournoi/… ;
 * les autres chemins internes restent des <Link> sans lang ; les liens externes s'ouvrent
 * dans un nouvel onglet avec leur href inchangé.
 * Spec : docs/specs/-liens-internes-redirection-interne-avec-prfixe-de-langue-ty.md
 */

const MOCK_PORT = 4000;
const EXTERNAL_URL = "https://example.org/rchc";

// Un seul chapitre, en premier (R6). Aucun titre « Inscription » : la règle
// isInscriptionArticle ne doit pas s'appliquer ici.
const ARTICLES = [
  makeArticle({
    titre: "Infos",
    titreEn: "Info",
    description: "Lien vers la page récapitulative.",
    descriptionEn: "Link to the summary page.",
    lienUrl: "/tournoi/infos",
  }),
  makeArticle({
    titre: "Infos FR",
    titreEn: "Info FR",
    description: "Lien vers la page récapitulative, forcée en français.",
    descriptionEn: "Link to the summary page, forced to French.",
    lienUrl: "/tournoi/infos?lang=fr",
  }),
  makeArticle({
    titre: "Externe",
    titreEn: "External",
    description: "Lien vers un site tiers.",
    descriptionEn: "Link to a third-party site.",
    lienUrl: EXTERNAL_URL,
  }),
  makeArticle({
    titre: "Page inscription",
    titreEn: "Registration page",
    description: "Lien vers la page d'inscription.",
    descriptionEn: "Link to the registration page.",
    lienUrl: "/inscription",
  }),
];

const GROUPES = [makeGroupe("Liens", ARTICLES, { nomEn: "Links", ordre: 0 })];

/** Active le sous-écran de l'article (un clic sur son segment suspend aussi l'avance auto). */
async function activerArticle(page: Page, titre: string) {
  const chapter = page.getByTestId("presentation-chapter-Liens");
  const index = ARTICLES.findIndex((a) => a.titre === titre);
  await chapter.getByRole("tab").nth(index).click();
  await expect(chapter.getByRole("tab").nth(index)).toHaveAttribute("aria-selected", "true");
  return page.getByTestId(`presentation-subtheme-${titre}`).getByTestId("presentation-subtheme-cta");
}

async function gotoPresentation(page: Page, lang: "fr" | "en" = "fr") {
  await page.goto("/");
  await expect(page.getByTestId("presentation-chapter-Liens")).toBeVisible();
  // R6 : la langue de / est un état local, à choisir après le goto et avant d'activer l'article.
  if (lang === "en") {
    await page.getByTestId("presentation-language-en").click();
    await expect(page.getByTestId("presentation-language-en")).toHaveAttribute("aria-pressed", "true");
  }
}

test.describe("Liens internes de la présentation — ?lang réservé à /tournoi/*", () => {
  let mock: MockBackHandle | null = null;

  test.beforeAll(async () => {
    mock = await startMockBack(MOCK_PORT, {
      editionEtape: "INSCRIPTIONS_OUVERTES",
      presentationGroupes: GROUPES,
    });
  });

  test.afterAll(async () => {
    if (mock) await mock.close();
  });

  test.beforeEach(async ({ context }) => {
    // Jamais d'appel réseau sortant : le site tiers est simulé localement.
    await context.route("https://example.org/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<p>site tiers</p>" }),
    );
  });

  test("1 · /tournoi/infos s'ouvre dans le même onglet avec la langue courante ajoutée (CA1, CA2)", async ({
    page,
    context,
  }) => {
    await gotoPresentation(page, "en");
    const cta = await activerArticle(page, "Infos");

    await expect(cta).toHaveText("Learn more");
    await expect(cta).toHaveAttribute("href", "/tournoi/infos?lang=en");
    await expect(cta).not.toHaveAttribute("target", /.+/);

    await cta.click();

    await expect(page).toHaveURL(/\/tournoi\/infos\?lang=en$/);
    expect(context.pages()).toHaveLength(1);
    await expect(page.getByRole("heading", { level: 2, name: "Links" })).toBeVisible();
  });

  test("2 · un paramètre lang déjà présent est conservé, même si l'interface est en EN (CA2)", async ({
    page,
    context,
  }) => {
    await gotoPresentation(page, "en");
    const cta = await activerArticle(page, "Infos FR");

    await expect(cta).toHaveAttribute("href", "/tournoi/infos?lang=fr");
    await cta.click();

    await expect(page).toHaveURL(/\/tournoi\/infos\?lang=fr$/);
    expect(context.pages()).toHaveLength(1);
    await expect(page.getByRole("heading", { level: 2, name: "Liens" })).toBeVisible();
  });

  test("3 · un lien externe ouvre un nouvel onglet, href inchangé ; la présentation reste sur / (CA4)", async ({
    page,
    context,
  }) => {
    await gotoPresentation(page, "en");
    const cta = await activerArticle(page, "Externe");

    await expect(cta).toHaveAttribute("href", EXTERNAL_URL);
    await expect(cta).toHaveAttribute("target", "_blank");
    await expect(cta).toHaveAttribute("rel", "noopener noreferrer");

    const [popup] = await Promise.all([context.waitForEvent("page"), cta.click()]);
    await popup.waitForLoadState();

    expect(popup.url()).toBe(EXTERNAL_URL);
    await expect(popup.getByText("site tiers")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(context.pages()).toHaveLength(2);
  });

  test("4 · /inscription mène à /inscription dans le même onglet, sans lang (CA3)", async ({ page, context }) => {
    await gotoPresentation(page, "en");
    const cta = await activerArticle(page, "Page inscription");

    await expect(cta).toHaveAttribute("href", "/inscription");
    await expect(cta).not.toHaveAttribute("target", /.+/);

    // InscriptionPage renvoie aussitôt un visiteur anonyme vers /connexion (replace) :
    // on enregistre la navigation SPA pour prouver que le lien a bien mené à /inscription.
    await page.evaluate(() => {
      const w = window as unknown as { __pushed: string[] };
      w.__pushed = [];
      const original = history.pushState.bind(history);
      history.pushState = (data, unused, url) => {
        w.__pushed.push(String(url));
        return original(data, unused, url);
      };
    });

    await cta.click();

    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __pushed: string[] }).__pushed))
      .toEqual(["/inscription"]);
    expect(context.pages()).toHaveLength(1);
    await expect(page).not.toHaveURL(/lang=/);
  });

  test("5 · sur /tournoi/infos : /inscription sans lang ni target, externe en _blank, pas d'auto-lien (CA1, CA3, CA4)", async ({
    page,
  }) => {
    await page.goto("/tournoi/infos?lang=en");
    await expect(page.getByTestId("tournoi-infos-chapter-Liens")).toBeVisible();

    const inscription = page
      .getByTestId("tournoi-infos-article-Page inscription")
      .getByTestId("tournoi-infos-article-link");
    await expect(inscription).toHaveAttribute("href", "/inscription");
    await expect(inscription).not.toHaveAttribute("target", /.+/);
    await expect(inscription).toHaveText("Learn more");

    const externe = page.getByTestId("tournoi-infos-article-Externe").getByTestId("tournoi-infos-article-link");
    await expect(externe).toHaveAttribute("href", EXTERNAL_URL);
    await expect(externe).toHaveAttribute("target", "_blank");
    await expect(externe).toHaveText("example.org");

    // Lien vers la page elle-même : omis. Lien /tournoi/infos?lang=fr : également vers soi-même, omis.
    await expect(
      page.getByTestId("tournoi-infos-article-Infos").getByTestId("tournoi-infos-article-link"),
    ).toHaveCount(0);
    await expect(
      page.getByTestId("tournoi-infos-article-Infos FR").getByTestId("tournoi-infos-article-link"),
    ).toHaveCount(0);
  });
});
