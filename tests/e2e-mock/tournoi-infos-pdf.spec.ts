import { test, expect, type Page } from "@playwright/test";
import { startMockBack, type MockBackHandle } from "../mocks/mock-back";
import {
  CHAPTER_IMAGE_PATH,
  EDITION_COMPLETE,
  buildGroupesVolumeReel,
  makeArticle,
  makeGroupe,
} from "../fixtures/tournoiInfos.fixture";

/**
 * Impression / PDF de /tournoi/infos : pagination A4 réelle (CA3), pas de bouton PDF sur /
 * (CA1), classes d'impression sans effet à l'écran (CA5).
 * Spec : docs/specs/impression-pdf-contexte-la-prsentation-actuelle-ne-propose-p.md
 */

const MOCK_PORT = 4000;

// Édition partagée (midi UTC) ; le mock remplace son `etape` par `editionEtape`.
const EDITION = EDITION_COMPLETE;

const PARAGRAPHE =
  "Les matchs se jouent sur glace entière, avec changement volant et arrêt de chrono sur les deux dernières minutes de jeu.";

/** Description de longueur variable, un bloc par paragraphe (séparés par une ligne vide). */
function description(paragraphes: number): string {
  return Array.from({ length: paragraphes }, (_, i) => `${i + 1}. ${PARAGRAPHE}`).join("\n\n");
}

const NB_CHAPITRES = 3;
const ARTICLES_PAR_CHAPITRE = 5;
const NB_ARTICLES = NB_CHAPITRES * ARTICLES_PAR_CHAPITRE;
const TITRES = Array.from({ length: NB_ARTICLES }, (_, i) => `Article ${i + 1}`);
const TITRE_LONG = "Article 8";

const GROUPES = [
  ...Array.from({ length: NB_CHAPITRES }, (_, c) =>
    makeGroupe(
      `Chapitre ${c + 1}`,
      Array.from({ length: ARTICLES_PAR_CHAPITRE }, (_, a) => {
        const titre = TITRES[c * ARTICLES_PAR_CHAPITRE + a];
        return makeArticle({
          surtitre: `Rubrique ${c + 1}.${a + 1}`,
          titre,
          // Article long (> 1 500 caractères → data-long) ; les autres de 300 à 600 caractères.
          description: titre === TITRE_LONG ? description(14) : description(3 + (a % 3)),
          faits: a === 0 ? "16|Équipes\n2|Jours\n{{fraisInscription}}|Inscription" : "",
        });
      }),
      { nomEn: `Chapter ${c + 1}`, ordre: c, imageUrl: CHAPTER_IMAGE_PATH },
    ),
  ),
  makeGroupe("Médias", [makeArticle({ titre: "Photos", description: "Galerie photos du tournoi." })], {
    nomEn: "Media",
    ordre: NB_CHAPITRES,
  }),
];

/** Pages du PDF sans dépendance (R8) : objets `/Type /Page`, sans compter `/Type /Pages`. */
function compterPages(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page(?![a-zA-Z])/g) ?? []).length;
}

/** `/Count` de l'arbre `/Pages` racine : recoupement de `compterPages`. */
function countDeclare(pdf: Buffer): number {
  const counts = [
    ...pdf
      .toString("latin1")
      .matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g),
  ].map((m) => Number(m[1] ?? m[2]));
  return counts.length > 0 ? Math.max(...counts) : -1;
}

async function gotoInfos(page: Page) {
  await page.goto("/tournoi/infos");
  await expect(page.getByTestId("tournoi-infos-chapter-Chapitre 1")).toBeVisible();
}

test.describe("Impression / PDF de /tournoi/infos", () => {
  let mock: MockBackHandle | null = null;

  test.beforeAll(async () => {
    mock = await startMockBack(MOCK_PORT, {
      editionEtape: "INSCRIPTIONS_OUVERTES",
      edition: EDITION,
      presentationGroupes: GROUPES,
    });
  });

  test.afterAll(async () => {
    if (mock) await mock.close();
  });

  test("CA3 · le PDF A4 compte plusieurs pages, sans dépasser articles + 2", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "page.pdf() n'existe qu'avec Chromium headless");
    await gotoInfos(page);

    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true, printBackground: false });

    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    const pages = compterPages(pdf);
    // Recoupement de l'heuristique : le /Count de l'arbre /Pages racine doit valoir le même nombre.
    expect(countDeclare(pdf)).toBe(pages);
    expect(pages).toBeGreaterThan(1);
    expect(pages).toBeLessThanOrEqual(NB_ARTICLES + 2);
  });

  test("CA3 · en média print, les 15 titres d'articles sont visibles, Médias est absent, l'article long est marqué data-long", async ({
    page,
  }) => {
    await gotoInfos(page);
    await page.emulateMedia({ media: "print" });

    await expect(page.getByRole("heading", { level: 3 })).toHaveText(TITRES);
    for (const titre of TITRES) {
      await expect(page.getByRole("heading", { level: 3, name: titre, exact: true })).toBeVisible();
    }
    await expect(page.getByTestId("tournoi-infos-chapter-Médias")).toHaveCount(0);

    const long = page.locator('article[data-long="true"]');
    await expect(long).toHaveCount(1);
    await expect(long).toHaveAttribute("data-testid", `tournoi-infos-article-${TITRE_LONG}`);
    // Seuls les articles courts sont protégés contre la coupure (pas de page blanche avant un article long).
    await expect(long).not.toHaveCSS("break-inside", "avoid");
    await expect(page.getByTestId("tournoi-infos-article-Article 1")).toHaveCSS("break-inside", "avoid");
    await expect(page.getByRole("heading", { level: 2, name: "Chapitre 2" })).toHaveCSS("break-after", "avoid");
    // Pas de saut de page forcé par chapitre.
    await expect(page.getByTestId("tournoi-infos-chapter-Chapitre 2")).toHaveCSS("break-before", "auto");
  });

  test("CA2 · en média print, la page est mise en document : blanc, police système, sans flex ni sticky", async ({
    page,
  }) => {
    await gotoInfos(page);
    await page.emulateMedia({ media: "print" });

    const racine = page.getByTestId("tournoi-infos-page");
    await expect(racine).toHaveCSS("display", "block");
    await expect(racine).toHaveCSS("font-family", /system-ui/);
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.locator("header.tournoi-infos-header")).toHaveCSS("display", "block");
    await expect(page.locator("div.sticky.top-0").first()).toBeHidden();
    for (const img of await page.locator("img").all()) {
      await expect(img).toBeHidden();
    }
    await expect(page.getByTestId("tournoi-infos-print-footer")).toBeVisible();
  });

  test("CA5 · retour de print à screen : TopBar, images de chapitre et bouton PDF réapparaissent (annexe tests E7)", async ({
    page,
  }) => {
    await gotoInfos(page);
    const topBar = page.locator("div.sticky.top-0").first();
    const images = page.getByTestId("chapter-image");
    const bouton = page.getByTestId("tournoi-infos-pdf");
    const pied = page.getByTestId("tournoi-infos-print-footer");

    await page.emulateMedia({ media: "print" });
    await expect(topBar).toBeHidden();
    await expect(images.first()).toBeHidden();
    await expect(bouton).toBeHidden();
    await expect(pied).toBeVisible();

    await page.emulateMedia({ media: "screen" });
    await expect(topBar).toBeVisible();
    await expect(images).toHaveCount(NB_CHAPITRES);
    for (const image of await images.all()) {
      await expect(image).toBeVisible();
    }
    await expect(bouton).toBeVisible();
    await expect(page.getByTestId("presentation-language-toggle")).toBeVisible();
    await expect(pied).toBeHidden();
  });

  test("CA5 · à l'écran, la TopBar reste visible et le pied imprimé est masqué", async ({ page }) => {
    await page.emulateMedia({ media: "screen" });
    await gotoInfos(page);

    await expect(page.locator("div.sticky.top-0").first()).toBeVisible();
    await expect(page.getByTestId("tournoi-infos-pdf")).toBeVisible();
    await expect(page.getByTestId("presentation-language-toggle")).toBeVisible();
    await expect(page.getByTestId("tournoi-infos-print-footer")).toBeHidden();
  });

  test("CA1 · pas de bouton « Télécharger en PDF » sur la présentation /", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("presentation-page")).toBeVisible();

    await expect(page.getByTestId("tournoi-infos-pdf")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Télécharger en PDF|Download PDF/ })).toHaveCount(0);
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("CA5 · les Tabs du bas sont visibles à l'écran et masquées à l'impression", async ({ page }) => {
      await page.emulateMedia({ media: "screen" });
      await gotoInfos(page);

      const tabs = page.locator("div.fixed.bottom-0").first();
      await expect(tabs).toBeVisible();
      await expect(page.locator("div.sticky.top-0").first()).toBeVisible();

      await page.emulateMedia({ media: "print" });
      await expect(tabs).toBeHidden();
      await expect(page.locator("div.sticky.top-0").first()).toBeHidden();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  });
});

test.describe("Impression / PDF — volume réel (spec consolidée CA5b)", () => {
  const GROUPES_VOLUME_REEL = buildGroupesVolumeReel();
  const SEUIL_PAGES = 5;
  let mock: MockBackHandle | null = null;

  test.beforeAll(async () => {
    mock = await startMockBack(MOCK_PORT, {
      editionEtape: "INSCRIPTIONS_OUVERTES",
      edition: EDITION,
      presentationGroupes: GROUPES_VOLUME_REEL,
    });
  });

  test.afterAll(async () => {
    if (mock) await mock.close();
  });

  test("CA5b · ~15 000 caractères (22 articles) tiennent en au plus 5 pages A4", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "page.pdf() n'existe qu'avec Chromium headless");
    await page.goto("/tournoi/infos");
    await expect(page.getByTestId("tournoi-infos-chapter-Challenge")).toBeVisible();

    await page.emulateMedia({ media: "print" });
    // Tout le contenu est rendu (22 h3, Médias exclu, article long marqué) avant de générer le PDF.
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(22);
    await expect(page.getByTestId("tournoi-infos-chapter-Médias")).toHaveCount(0);
    await expect(page.locator('article[data-long="true"]')).toHaveCount(1);
    await expect(page.getByTestId("tournoi-infos-page")).not.toContainText("{{");

    // Règles de la spec conservées (pas de police réduite ni de coupure libre pour « faire tenir ») :
    // 10 pt, interligne 1,3, articles courts insécables.
    const article = page.getByTestId("tournoi-infos-article-Règlement — article 1");
    await expect(article).toHaveCSS("font-size", /^13\.33\d*px$/); // 10 pt
    await expect(article).toHaveCSS("break-inside", "avoid");

    const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true, printBackground: false });
    const pages = compterPages(pdf);
    test.info().annotations.push({ type: "pages-pdf-volume-reel", description: String(pages) });

    expect(countDeclare(pdf)).toBe(pages);
    expect(pages).toBeGreaterThan(1);
    expect(pages).toBeLessThanOrEqual(SEUIL_PAGES);
  });
});
