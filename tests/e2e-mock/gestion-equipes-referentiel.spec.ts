import { test, expect, type Page } from "@playwright/test";
import { startMockBack, type MockBackHandle } from "../mocks/mock-back";

// docs/specs/recommandations-finales-contexte-la-mise-en-place-de-la-colo.md — CA1 à CA6, CA9, CA13
// Écran de gestion des équipes du référentiel (organisateur).

const MOCK_PORT = 4000;

/** JWT non signé : le front n'en décode que le payload (cf. AuthContext.tokenToUser). */
function fakeJwt(sub: string): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64({ sub, email: "orga@rchc.fr" })}.sig`;
}

const EQUIPES = [
  { id: 1, nom: "Courbevoie", nomComplet: "Les Coqs de Courbevoie", nbCandidatures: 2 },
  { id: 2, nom: "Rennes" },
  { id: 3, nom: "Orléans", nomComplet: "Les Renards d'Orléans", active: false },
  { id: 4, nom: "Meudon", nomComplet: "Les Comètes de Meudon" },
];

const ligne = (page: Page, nom: string) =>
  page.getByRole("listitem").filter({ has: page.getByRole("button", { name: `Modifier ${nom}` }) });

test.describe("Gestion des équipes du référentiel (organisateur)", () => {
  let mock: MockBackHandle;

  test.afterEach(async () => {
    await mock.close();
  });

  test.beforeEach(async ({ page }) => {
    mock = await startMockBack(MOCK_PORT, {
      organisateur: true,
      editionEtape: "CLOTUREE",
      candidatures: [],
      equipes: EQUIPES,
    });
    await page.addInitScript((token) => {
      localStorage.setItem("auth_token", token);
    }, fakeJwt("organisateur-1"));
  });

  test("accès depuis l'administration, liste complète, recherche et filtre", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("link", { name: "Équipes du référentiel" }).click();

    await expect(page).toHaveURL(/\/admin\/equipes$/);
    await expect(page.getByRole("heading", { level: 1, name: "Équipes du référentiel" })).toBeVisible();
    await expect(page.getByText("4 équipes", { exact: true })).toBeVisible();

    // Actives et désactivées, nom court + nom complet, état et candidatures.
    await expect(ligne(page, "Courbevoie")).toContainText("Les Coqs de Courbevoie");
    await expect(ligne(page, "Courbevoie")).toContainText("Active");
    await expect(ligne(page, "Courbevoie")).toContainText("2 candidatures");
    await expect(ligne(page, "Orléans")).toContainText("Désactivée");
    await expect(ligne(page, "Rennes")).not.toContainText("candidature");

    // Recherche par nom complet, puis sans tenir compte de la casse ni des accents.
    const recherche = page.getByLabel("Rechercher une équipe");
    await recherche.fill("coqs");
    await expect(page.getByText("1 sur 4 équipes")).toBeVisible();
    await expect(ligne(page, "Courbevoie")).toBeVisible();
    await recherche.fill("ORLEANS");
    await expect(ligne(page, "Orléans")).toBeVisible();
    await expect(ligne(page, "Courbevoie")).toHaveCount(0);
    await recherche.fill("strasbourg");
    await expect(page.getByText("Aucune équipe trouvée.")).toBeVisible();
    await recherche.fill("");

    // Filtre d'état.
    const filtres = page.getByRole("group", { name: "Filtrer par état" });
    await filtres.getByRole("button", { name: "Désactivées" }).click();
    await expect(page.getByText("1 sur 4 équipes")).toBeVisible();
    await expect(ligne(page, "Orléans")).toBeVisible();
    await filtres.getByRole("button", { name: "Actives" }).click();
    await expect(page.getByText("3 sur 4 équipes")).toBeVisible();
    await expect(ligne(page, "Orléans")).toHaveCount(0);
  });

  test("équipe référencée par des candidatures : nom court verrouillé, nom complet modifiable", async ({
    page,
  }) => {
    await page.goto("/admin/equipes");
    await page.getByRole("button", { name: "Modifier Courbevoie" }).click();

    const nomCourt = page.getByLabel("Nom court");
    await expect(nomCourt).toHaveValue("Courbevoie");
    await expect(nomCourt).not.toBeEditable();
    await expect(
      page.getByText("Nom court non modifiable : 2 candidatures font référence à cette équipe."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Enregistrer" })).toBeDisabled();

    await page.getByLabel("Nom complet (optionnel)").fill("Coqs de Courbevoie HC");
    await page.getByRole("button", { name: "Enregistrer" }).click();

    // Ligne à jour sans rechargement, nom court intact.
    await expect(ligne(page, "Courbevoie")).toContainText("Coqs de Courbevoie HC");
    await expect(page.getByLabel("Nom court")).toHaveCount(0);

    // Vider le nom complet le supprime.
    await page.getByRole("button", { name: "Modifier Courbevoie" }).click();
    await page.getByLabel("Nom complet (optionnel)").fill("");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(ligne(page, "Courbevoie")).not.toContainText("Coqs de Courbevoie HC");

    // Les valeurs survivent à un rechargement : elles sont bien enregistrées côté back.
    await page.reload();
    await expect(ligne(page, "Courbevoie")).toBeVisible();
    await expect(ligne(page, "Courbevoie")).not.toContainText("HC");
    expect(mock.getEquipes().find((e) => e.id === 1)).toMatchObject({
      nom: "Courbevoie",
      nomComplet: null,
    });
  });

  test("équipe sans candidature : renommage contrôlé comme à la création", async ({ page }) => {
    await page.goto("/admin/equipes");
    await page.getByRole("button", { name: "Modifier Rennes" }).click();
    const nomCourt = page.getByLabel("Nom court");
    await expect(nomCourt).toBeEditable();
    const enregistrer = page.getByRole("button", { name: "Enregistrer" });

    // Nom vide : rien à enregistrer.
    await nomCourt.fill("   ");
    await expect(enregistrer).toBeDisabled();

    // Nom déjà pris.
    await nomCourt.fill("Meudon");
    await enregistrer.click();
    await expect(page.getByRole("alert")).toHaveText("Cette équipe existe déjà");
    await expect(nomCourt).toHaveValue("Meudon");

    // Emoji refusé.
    await nomCourt.fill("Rennes 🦊");
    await enregistrer.click();
    await expect(page.getByRole("alert")).toHaveText("Le nom ne doit pas contenir d'emoji");

    // Renommage valide, avec ajout d'un nom complet.
    await nomCourt.fill("Rennes Cormorans");
    await page.getByLabel("Nom complet (optionnel)").fill("Les Cormorans de Rennes");
    await enregistrer.click();

    await expect(ligne(page, "Rennes Cormorans")).toContainText("Les Cormorans de Rennes");
    await expect(page.getByRole("button", { name: "Modifier Rennes", exact: true })).toHaveCount(0);
    expect(mock.getEquipes().find((e) => e.id === 2)).toMatchObject({
      nom: "Rennes Cormorans",
      nomComplet: "Les Cormorans de Rennes",
    });
  });

  test("désactivation avec confirmation, puis réactivation", async ({ page }) => {
    await page.goto("/admin/equipes");

    // Annuler ne change rien.
    await page.getByRole("button", { name: "Désactiver Meudon" }).click();
    const dialogue = page.getByRole("dialog", { name: "Désactiver « Meudon » ?" });
    await expect(dialogue).toContainText("ne sera plus proposée aux responsables");
    await dialogue.getByRole("button", { name: "Annuler" }).click();
    await expect(dialogue).toHaveCount(0);
    await expect(ligne(page, "Meudon")).toContainText("Active");

    // Une équipe candidate : la confirmation mentionne ses candidatures.
    await page.getByRole("button", { name: "Désactiver Courbevoie" }).click();
    await expect(page.getByRole("dialog")).toContainText("2 candidatures font référence à cette équipe.");
    await page.getByRole("button", { name: "Confirmer" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(ligne(page, "Courbevoie")).toContainText("Désactivée");
    await expect(page.getByRole("button", { name: "Activer Courbevoie" })).toBeVisible();
    expect(mock.getEquipes().find((e) => e.id === 1)?.active).toBe(false);

    // Réactivation immédiate, sans confirmation.
    await page.getByRole("button", { name: "Activer Courbevoie" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Désactiver Courbevoie" })).toBeVisible();
    await expect(ligne(page, "Courbevoie")).toContainText("Active");
    expect(mock.getEquipes().find((e) => e.id === 1)?.active).toBe(true);
  });

  test("aide de l'écran et tenue à 375 px avec un nom complet de 150 caractères", async ({ page }) => {
    await mock.close();
    mock = await startMockBack(MOCK_PORT, {
      organisateur: true,
      editionEtape: "CLOTUREE",
      candidatures: [],
      equipes: [{ id: 1, nom: "Courbevoie", nomComplet: "X".repeat(150), nbCandidatures: 1 }],
    });
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/admin/equipes");
    await expect(ligne(page, "Courbevoie")).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await page.getByRole("button", { name: "Modifier Courbevoie" }).click();
    await expect(page.getByLabel("Nom court")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    const aide = page.getByText("Comment fonctionne cet écran ?");
    await expect(page.getByText("Pourquoi un nom court est verrouillé")).toBeHidden();
    await aide.click();
    await expect(page.getByText("Pourquoi un nom court est verrouillé")).toBeVisible();
    await expect(page.getByText("Désactiver une équipe", { exact: true })).toBeVisible();
  });
});

test.describe("Gestion des équipes du référentiel — accès refusé", () => {
  let mock: MockBackHandle;

  test.afterEach(async () => {
    await mock.close();
  });

  test("un responsable d'équipe est renvoyé à l'accueil", async ({ page }) => {
    mock = await startMockBack(MOCK_PORT, { responsable: true, equipes: EQUIPES });
    await page.addInitScript((token) => {
      localStorage.setItem("auth_token", token);
    }, fakeJwt("responsable-1"));
    const appelsToutes: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/inscription/equipes/toutes")) appelsToutes.push(req.url());
    });

    await page.goto("/admin/equipes");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Équipes du référentiel" })).toHaveCount(0);
    expect(appelsToutes).toEqual([]);
  });
});
