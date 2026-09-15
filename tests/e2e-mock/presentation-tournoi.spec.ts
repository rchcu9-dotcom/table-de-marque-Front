import { test, expect } from "@playwright/test";
import { startMockBack } from "../mocks/mock-back";

const MOCK_PORT = 4000;

// Le backend réel ne renvoie jamais undefined pour surtitre/faits/titreAccroche/
// descriptionCourte (colonnes NOT NULL DEFAULT '' ou repli `?? ''` côté
// repository, cf. back/src/domain/presentation/entities/article-presentation.entity.ts)
// — on reproduit ce contrat ici plutôt que de laisser le composant les recevoir
// undefined, ce qu'il ne gère pas (cf. resolveTokens qui appelle .replace() sur
// la valeur).
const GROUPES_FIXTURE = [
  {
    nom: "Présentation",
    nomEn: "Presentation",
    ordre: 0,
    dureeMs: 5000,
    imageUrl: null,
    articles: [
      {
        groupe: "Présentation",
        groupeEn: "Presentation",
        surtitre: "Résumé",
        surtitreEn: "Summary",
        titre: "Bienvenue",
        titreEn: "Welcome",
        titreAccroche: "",
        titreAccrocheEn: "",
        descriptionCourte: "",
        descriptionCourteEn: "",
        description: "Bienvenue au tournoi RCHC.\nEdition 2026.",
        descriptionEn: "Welcome to the RCHC tournament.\nEdition 2026.",
        faits: "",
        faitsEn: "",
        imageUrl: null,
        lienUrl: null,
        lieu: "Patinoire de Cergy",
        mapsQuery: "48.0333,2.0333",
      },
      {
        groupe: "Présentation",
        groupeEn: "Presentation",
        surtitre: "Inscriptions",
        surtitreEn: "",
        titre: "Inscription",
        titreEn: "",
        titreAccroche: "",
        titreAccrocheEn: "",
        descriptionCourte: "",
        descriptionCourteEn: "",
        description: "Inscrivez votre équipe en ligne.",
        descriptionEn: "",
        faits: "",
        faitsEn: "",
        imageUrl: null,
        lienUrl: "https://dossier-tournoi-rchc-h8t7.glide.page",
        lieu: null,
        mapsQuery: null,
      },
    ],
  },
  {
    nom: "Tournoi 5v5 pleine Glace",
    nomEn: "5v5 Full Ice Tournament",
    ordre: 1,
    dureeMs: 5000,
    imageUrl: null,
    articles: [
      {
        groupe: "Tournoi 5v5 pleine Glace",
        groupeEn: "5v5 Full Ice Tournament",
        surtitre: "Formule",
        surtitreEn: "Format",
        titre: "Deux mi-temps",
        titreEn: "Two halves",
        titreAccroche: "",
        titreAccrocheEn: "",
        descriptionCourte: "",
        descriptionCourteEn: "",
        description: "Deux mi-temps de 12 minutes.",
        descriptionEn: "Two 12-minute halves.",
        faits: "",
        faitsEn: "",
        imageUrl: null,
        lienUrl: null,
        lieu: null,
        mapsQuery: null,
      },
    ],
  },
  {
    nom: "Challenge Individuel",
    nomEn: "Individual Challenge",
    ordre: 2,
    dureeMs: 5000,
    imageUrl: null,
    articles: [
      {
        groupe: "Challenge Individuel",
        groupeEn: "Individual Challenge",
        surtitre: "Règlement",
        surtitreEn: "Rules",
        titre: "Slalom, vitesse, tir",
        titreEn: "Slalom, speed, shooting",
        titreAccroche: "",
        titreAccrocheEn: "",
        descriptionCourte: "",
        descriptionCourteEn: "",
        description: "Slalom, vitesse, tir.",
        descriptionEn: "Slalom, speed, shooting.",
        faits: "",
        faitsEn: "",
        imageUrl: null,
        lienUrl: null,
        lieu: null,
        mapsQuery: null,
      },
    ],
  },
  {
    nom: "Tournoi 3v3 « FUN »",
    nomEn: "3v3 FUN Tournament",
    ordre: 3,
    dureeMs: 5000,
    imageUrl: null,
    articles: [
      {
        groupe: "Tournoi 3v3 « FUN »",
        groupeEn: "3v3 FUN Tournament",
        surtitre: "Déroulement",
        surtitreEn: "Format",
        titre: "Nouveauté 2026",
        titreEn: "New in 2026",
        titreAccroche: "",
        titreAccrocheEn: "",
        descriptionCourte: "",
        descriptionCourteEn: "",
        description: "Nouveauté 2026.",
        descriptionEn: "New in 2026.",
        faits: "",
        faitsEn: "",
        imageUrl: null,
        lienUrl: null,
        lieu: null,
        mapsQuery: null,
      },
    ],
  },
  {
    nom: "Médias",
    nomEn: "Media",
    ordre: 4,
    dureeMs: 5000,
    imageUrl: null,
    articles: [
      {
        groupe: "Médias",
        groupeEn: "Media",
        surtitre: "Chaîne YouTube",
        surtitreEn: "YouTube channel",
        titre: "Suivez le live",
        titreEn: "Watch live",
        titreAccroche: "",
        titreAccrocheEn: "",
        descriptionCourte: "",
        descriptionCourteEn: "",
        description: "Suivez le live.",
        descriptionEn: "Watch live.",
        faits: "",
        faitsEn: "",
        imageUrl: null,
        lienUrl: "https://youtube.com/rchc",
        lieu: null,
        mapsQuery: null,
      },
    ],
  },
];

test.describe("Page Présentation du tournoi — phase Inscription ouverte", () => {
  let mockHandle: { close: () => Promise<void> } | null = null;

  test.beforeAll(async () => {
    mockHandle = await startMockBack(MOCK_PORT, {
      editionEtape: "INSCRIPTIONS_OUVERTES",
      presentationGroupes: GROUPES_FIXTURE,
    });
  });

  test.afterAll(async () => {
    if (mockHandle) await mockHandle.close();
  });

  test("le menu Accueil affiche la page Présentation, pas la HomePage momentum (critère 1)", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("presentation-page")).toBeVisible();
    await expect(page.getByTestId("home-page")).toHaveCount(0);
  });

  test("affiche les 5 chapitres attendus, dans l'ordre, chacun avec au moins un sous-écran (critère 4)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("presentation-page")).toBeVisible();

    const expectedGroups = GROUPES_FIXTURE.map((g) => g.nom);

    const eyebrows = await page
      .locator('[data-testid="presentation-page"] .presentation-chapter-eyebrow')
      .allTextContents();
    expect(eyebrows).toEqual(
      expectedGroups.map((nom, i) => `Chapitre ${i + 1} / ${expectedGroups.length} — ${nom}`),
    );

    for (const groupe of GROUPES_FIXTURE) {
      const section = page.getByTestId(`presentation-chapter-${groupe.nom}`);
      await expect(section).toBeVisible();
      for (const article of groupe.articles) {
        await expect(section.getByTestId(`presentation-subtheme-${article.titre}`)).toBeVisible();
      }
    }
  });

  test("bascule FR/EN avec repli propre sur le FR quand une traduction manque (critère 7)", async ({
    page,
  }) => {
    await page.goto("/");
    const chapter = page.getByTestId("presentation-chapter-Présentation");

    await expect(chapter.getByRole("heading", { name: "Bienvenue" })).toBeVisible();
    await expect(page.getByText("Inscrivez votre équipe en ligne.")).toBeVisible();

    await page.getByTestId("presentation-language-en").click();

    // "Bienvenue" a une traduction EN -> bascule.
    await expect(chapter.getByRole("heading", { name: "Welcome" })).toBeVisible();
    // "Inscription" n'a pas de traduction EN -> repli sur le texte FR.
    await expect(page.getByText("Inscrivez votre équipe en ligne.")).toBeVisible();
  });

  test("le sous-écran Bienvenue affiche le lieu et un lien Google Maps (critère 6)", async ({
    page,
  }) => {
    await page.goto("/");

    const mapsLink = page
      .getByTestId("presentation-subtheme-Bienvenue")
      .getByTestId("presentation-maps-link");
    await expect(mapsLink).toBeVisible();
    await expect(mapsLink).toContainText("Patinoire de Cergy");
    await expect(mapsLink).toHaveAttribute(
      "href",
      /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=48\.0333%2C2\.0333$/,
    );
  });

  test("le CTA du sous-écran Inscription pointe vers la route interne /inscription", async ({
    page,
  }) => {
    await page.goto("/");

    const cta = page
      .getByTestId("presentation-subtheme-Inscription")
      .getByTestId("presentation-subtheme-cta");
    await expect(cta).toHaveAttribute("href", "/inscription");
  });
});

test.describe("Page Présentation du tournoi — phase autre que Inscription ouverte", () => {
  let mockHandle: { close: () => Promise<void> } | null = null;

  test.beforeAll(async () => {
    mockHandle = await startMockBack(MOCK_PORT, { editionEtape: "CLOTUREE" });
  });

  test.afterAll(async () => {
    if (mockHandle) await mockHandle.close();
  });

  test("le menu Accueil affiche la HomePage momentum, pas la page Présentation (critère 2)", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("home-page")).toBeVisible();
    await expect(page.getByTestId("presentation-page")).toHaveCount(0);
  });
});
