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

  // Chapitre « Présentation » : 2 sous-écrans (Bienvenue, Inscription).
  test.describe("navigation chapitres / sous-écrans — desktop (CA19)", () => {
    test("‹ / › / → changent de sous-écran, ↓ passe au chapitre suivant", async ({ page }) => {
      await page.goto("/");
      const chapter = page.getByTestId("presentation-chapter-Présentation");
      const tabs = chapter.getByRole("tab");
      const prev = chapter.getByTestId("presentation-prev-screen");
      const next = chapter.getByTestId("presentation-next-screen");

      // Point de départ déterministe (l'avance auto a pu tourner) : clic sur le 1er segment.
      await tabs.nth(0).click();
      await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");

      // Pointeur fin : chevrons visibles, ‹ désactivé sur le premier sous-écran.
      await expect(prev).toBeVisible();
      await expect(next).toBeVisible();
      await expect(prev).toHaveAttribute("aria-disabled", "true");
      await expect(prev).toHaveAccessibleName("Écran précédent");
      await expect(next).toHaveAccessibleName("Écran suivant");
      const box = await next.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);

      await next.click();
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
      await expect(next).toHaveAttribute("aria-disabled", "true");

      // Borné : pas de bouclage (force : Playwright refuse de cliquer un aria-disabled).
      await next.click({ force: true });
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");

      await prev.click();
      await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");

      // Clavier sur le chapitre actif (focus hors champ de saisie).
      await page.locator("body").click({ position: { x: 5, y: 5 } }).catch(() => {});
      await page.keyboard.press("ArrowRight");
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
      await page.keyboard.press("ArrowLeft");
      await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
      await page.keyboard.press("ArrowRight");
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");

      // ↓ : chapitre suivant, sans changer de sous-écran au préalable.
      const arrow = chapter.getByTestId("presentation-next-button");
      await expect(arrow).toHaveAccessibleName("Chapitre suivant");
      await arrow.click();
      await expect(page.getByTestId("presentation-chapter-Tournoi 5v5 pleine Glace")).toBeInViewport({
        ratio: 0.55,
      });
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    });

    test("↓ sur un sous-écran intermédiaire ne change pas de sous-écran (CA1)", async ({ page }) => {
      await page.goto("/");
      const chapter = page.getByTestId("presentation-chapter-Présentation");
      const tabs = chapter.getByRole("tab");

      await tabs.nth(0).click();
      await chapter.getByTestId("presentation-next-button").click();

      await expect(page.getByTestId("presentation-chapter-Tournoi 5v5 pleine Glace")).toBeInViewport({
        ratio: 0.55,
      });
      await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    });

    test("le dernier chapitre mène au panneau de fin, qui n'a pas de ↓ (CA3)", async ({ page }) => {
      await page.goto("/");
      const last = page.getByTestId("presentation-chapter-Médias");
      await last.scrollIntoViewIfNeeded();

      await last.getByTestId("presentation-next-button").click();

      const outro = page.getByTestId("presentation-outro");
      await expect(outro).toBeInViewport({ ratio: 0.55 });
      await expect(outro.getByTestId("presentation-next-button")).toHaveCount(0);
    });

    test("les chapitres à un seul sous-écran n'ont ni chevrons ni bouton pause (CA4)", async ({ page }) => {
      await page.goto("/");
      const single = page.getByTestId("presentation-chapter-Médias");

      await expect(single.getByTestId("presentation-prev-screen")).toHaveCount(0);
      await expect(single.getByTestId("presentation-next-screen")).toHaveCount(0);
      await expect(single.getByTestId("presentation-autoplay-toggle")).toHaveCount(0);
    });

    test("le bouton pause/lecture arrête puis relance l'avance automatique (CA16)", async ({ page }) => {
      await page.goto("/");
      const chapter = page.getByTestId("presentation-chapter-Présentation");
      const toggle = chapter.getByTestId("presentation-autoplay-toggle");

      await expect(toggle).toHaveAttribute("aria-pressed", "false");
      await expect(toggle).toHaveAccessibleName("Mettre en pause le défilement");

      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await expect(toggle).toHaveAccessibleName("Reprendre le défilement");

      // La barre de progression du segment courant reste figée.
      const fill = chapter.locator('[role="tab"][aria-selected="true"] i');
      const before = await fill.evaluate((el) => (el as HTMLElement).style.width);
      await page.waitForTimeout(1200);
      expect(await fill.evaluate((el) => (el as HTMLElement).style.width)).toBe(before);

      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-pressed", "false");
      await expect(toggle).toHaveAccessibleName("Mettre en pause le défilement");

      // Libellé EN.
      await page.getByTestId("presentation-language-en").click();
      await expect(toggle).toHaveAccessibleName("Pause slideshow");
    });

    test("une action manuelle suspend l'avance : le bouton propose « Reprendre » (CA15)", async ({
      page,
    }) => {
      await page.goto("/");
      const chapter = page.getByTestId("presentation-chapter-Présentation");

      await chapter.getByRole("tab").nth(1).click();

      await expect(chapter.getByTestId("presentation-autoplay-toggle")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(chapter.getByTestId("presentation-subscreen-announcer")).toHaveText("Inscription");
    });

    test("sous prefers-reduced-motion : pas de bouton pause, chevrons et clavier fonctionnent (CA17)", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      const chapter = page.getByTestId("presentation-chapter-Présentation");
      const tabs = chapter.getByRole("tab");

      await expect(chapter.getByTestId("presentation-autoplay-toggle")).toHaveCount(0);
      await chapter.getByTestId("presentation-next-screen").click();
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
      await page.keyboard.press("ArrowLeft");
      await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    });
  });

  test.describe("navigation chapitres / sous-écrans — mobile tactile (CA20)", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    async function swipe(
      page: import("@playwright/test").Page,
      from: { x: number; y: number },
      to: { x: number; y: number },
    ) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: from.x, y: from.y }],
      });
      const steps = 6;
      for (let i = 1; i <= steps; i++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            {
              x: from.x + ((to.x - from.x) * i) / steps,
              y: from.y + ((to.y - from.y) * i) / steps,
            },
          ],
        });
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await cdp.detach();
    }

    test("tap à droite, tap à gauche et swipe changent de sous-écran ; aucun chevron visible", async ({
      page,
    }) => {
      await page.goto("/");
      const chapter = page.getByTestId("presentation-chapter-Présentation");
      const tabs = chapter.getByRole("tab");

      await expect(chapter.getByTestId("presentation-prev-screen")).toBeHidden();
      await expect(chapter.getByTestId("presentation-next-screen")).toBeHidden();

      // Point de départ déterministe : tap sur le 1er segment (cible interactive, pas de tap-navigation).
      await tabs.nth(0).tap();
      await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");

      const box = (await chapter.boundingBox())!;
      // Point de fond sans élément interactif (lien Maps, CTA Inscription, ↓…) pour la
      // colonne x donnée, recherché dans le sous-écran actuellement affiché.
      const backgroundPoint = (fx: number) =>
        page.evaluate(
          ({ box, fx }) => {
            const x = box.x + box.width * fx;
            for (let fy = 0.9; fy > 0.2; fy -= 0.02) {
              const y = box.y + box.height * fy;
              const el = document.elementFromPoint(x, y);
              if (el && !el.closest('a,button,input,select,textarea,[role="tab"],[role="button"]')) {
                return { x, y };
              }
            }
            throw new Error("aucune zone de fond trouvée");
          },
          { box, fx },
        );

      const right = await backgroundPoint(0.8);
      await page.touchscreen.tap(right.x, right.y);
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");

      const left = await backgroundPoint(0.15);
      await page.touchscreen.tap(left.x, left.y);
      await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");

      // Swipe vers la gauche : écran suivant.
      const start = await backgroundPoint(0.8);
      await swipe(page, start, { x: box.x + box.width * 0.2, y: start.y + 5 });
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");

      // Swipe vers la droite : écran précédent.
      const startBack = await backgroundPoint(0.2);
      await swipe(page, startBack, { x: box.x + box.width * 0.8, y: startBack.y - 5 });
      await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    });
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
