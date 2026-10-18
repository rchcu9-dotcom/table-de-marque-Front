import { test, expect, type Page } from "@playwright/test";
import { startMockBack, type MockBackHandle } from "../mocks/mock-back";

// docs/specs/-mise-jour-du-parcours-dinscription-contexte-dans-le-cadre-d.md — critère 7
// Recette du parcours d'un responsable avec le nom complet : recherche, sélection,
// candidature, puis création d'une équipe absente (avec et sans nom complet, doublon).

const MOCK_PORT = 4000;

/** JWT non signé : le front n'en décode que le payload (cf. AuthContext.tokenToUser). */
function fakeJwt(sub: string): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64({ sub, email: "resp@club.fr" })}.sig`;
}

const EQUIPES = [
  { id: 1, nom: "Courbevoie", nomComplet: "Les Coqs de Courbevoie" },
  { id: 2, nom: "Rennes", nomComplet: null },
  { id: 3, nom: "Trois-Chêne", nomComplet: "Les Renards de Trois-Chêne" },
];

const CANDIDATURES_URL = "/inscription/candidatures";
const EQUIPES_URL = "/inscription/equipes";

/** Ouvre le sélecteur d'équipe et renvoie le champ de recherche et la liste déroulante. */
async function ouvrirSelecteur(page: Page) {
  await page.getByRole("button", { name: /Choisir une équipe/ }).click();
  const recherche = page.getByPlaceholder("Rechercher...");
  await expect(recherche).toBeVisible();
  // La liste est le conteneur du champ de recherche et des options.
  const liste = recherche.locator("..").locator("..");
  return { recherche, options: liste.getByRole("button") };
}

async function ouvrirModale(page: Page) {
  await page.getByRole("button", { name: /Ton équipe n'est pas présente/ }).click();
  await expect(page.getByRole("heading", { name: "Ajouter une équipe" })).toBeVisible();
}

test.describe("Parcours d'inscription d'un responsable — nom court et nom complet", () => {
  let mock: MockBackHandle;

  test.afterEach(async () => {
    await mock.close();
  });

  test.beforeEach(async ({ page }) => {
    mock = await startMockBack(MOCK_PORT, {
      responsable: true,
      editionEtape: "INSCRIPTIONS_OUVERTES",
      equipes: EQUIPES,
    });
    await page.addInitScript((token) => {
      localStorage.setItem("auth_token", token);
    }, fakeJwt("responsable-1"));
    await page.goto("/inscription");
  });

  test("trouve son équipe par son nom complet, la sélectionne et dépose sa candidature", async ({ page }) => {
    const { recherche, options } = await ouvrirSelecteur(page);

    await recherche.fill("coqs");

    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText("Courbevoie");
    await expect(options.first()).toContainText("Les Coqs de Courbevoie");

    await options.first().click();
    await expect(recherche).toBeHidden();
    await expect(page.getByText("Les Coqs de Courbevoie")).toBeVisible();

    await page.getByRole("button", { name: "Lancer la demande" }).click();

    // Tableau de bord de la candidature : le nom court seul, jamais le nom complet.
    await expect(page.getByText(/^Soumis le /)).toBeVisible();
    await expect(page.getByText("Courbevoie", { exact: true })).toBeVisible();
    await expect(page.getByText("Les Coqs de Courbevoie")).toHaveCount(0);

    // La candidature désigne l'équipe par son identifiant : aucun nom n'est envoyé.
    const depots = mock.postBodies.filter((p) => p.url === CANDIDATURES_URL);
    expect(depots).toEqual([{ url: CANDIDATURES_URL, body: { equipeRefId: 1 }, status: 201 }]);

    // Après rechargement, la candidature vient du serveur : toujours le nom court.
    await page.reload();
    await expect(page.getByText("Courbevoie", { exact: true })).toBeVisible();
    await expect(page.getByText("Les Coqs de Courbevoie")).toHaveCount(0);
  });

  test("cherche sans tenir compte de la casse ni des accents, sur le nom court et le nom complet", async ({ page }) => {
    const { recherche, options } = await ouvrirSelecteur(page);

    // Sans saisie : toutes les équipes ; « Rennes », sans nom complet, tient sur une ligne.
    await expect(options).toHaveCount(3);
    await expect(options.filter({ hasText: "Rennes" })).toHaveText("Rennes");

    for (const saisie of ["COQS", "courb"]) {
      await recherche.fill(saisie);
      await expect(options).toHaveCount(1);
      await expect(options.first()).toContainText("Courbevoie");
    }

    await recherche.fill("chene");
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText("Trois-Chêne");

    await recherche.fill("strasbourg");
    await expect(options).toHaveCount(0);
    await expect(page.getByText("Aucune équipe trouvée.")).toBeVisible();
  });

  test("crée une équipe absente avec un nom complet, puis candidate", async ({ page }) => {
    await ouvrirModale(page);

    await page.getByLabel("Nom court").fill("San Jose");
    await page.getByLabel("Nom complet du club (optionnel)").fill("Les Sharks de San Jose");
    await page.getByRole("button", { name: "Soumettre" }).click();

    // Modale refermée, équipe sélectionnée et affichée sur deux lignes.
    await expect(page.getByRole("heading", { name: "Ajouter une équipe" })).toBeHidden();
    const selecteur = page.getByRole("button", { name: /San Jose/ });
    await expect(selecteur).toContainText("San Jose");
    await expect(selecteur).toContainText("Les Sharks de San Jose");

    const creations = mock.postBodies.filter((p) => p.url === EQUIPES_URL);
    expect(creations).toEqual([
      {
        url: EQUIPES_URL,
        body: { nom: "San Jose", nomComplet: "Les Sharks de San Jose" },
        status: 201,
      },
    ]);
    const creee = mock.getEquipes().find((e) => e.nom === "San Jose")!;
    expect(creee.nomComplet).toBe("Les Sharks de San Jose");

    await page.getByRole("button", { name: "Lancer la demande" }).click();

    await expect(page.getByText(/^Soumis le /)).toBeVisible();
    await expect(page.getByText("San Jose", { exact: true })).toBeVisible();
    await expect(page.getByText("Les Sharks de San Jose")).toHaveCount(0);
    expect(mock.postBodies.filter((p) => p.url === CANDIDATURES_URL)).toEqual([
      { url: CANDIDATURES_URL, body: { equipeRefId: creee.id }, status: 201 },
    ]);
  });

  test("crée une équipe absente sans nom complet, puis candidate", async ({ page }) => {
    await ouvrirModale(page);

    const soumettre = page.getByRole("button", { name: "Soumettre" });
    await expect(soumettre).toBeDisabled();
    await page.getByLabel("Nom court").fill("Meudon");
    await expect(soumettre).toBeEnabled();
    await soumettre.click();

    await expect(page.getByRole("heading", { name: "Ajouter une équipe" })).toBeHidden();
    // Une seule ligne : le bouton du sélecteur ne porte que le nom court.
    await expect(page.getByRole("button", { name: /Meudon/ })).toHaveText(/^Meudon\s*▾$/);

    // Le champ laissé vide n'est pas envoyé du tout.
    const creations = mock.postBodies.filter((p) => p.url === EQUIPES_URL);
    expect(creations).toEqual([{ url: EQUIPES_URL, body: { nom: "Meudon" }, status: 201 }]);
    const creee = mock.getEquipes().find((e) => e.nom === "Meudon")!;
    expect(creee.nomComplet).toBeNull();

    await page.getByRole("button", { name: "Lancer la demande" }).click();

    await expect(page.getByText(/^Soumis le /)).toBeVisible();
    await expect(page.getByText("Meudon", { exact: true })).toBeVisible();
    expect(mock.postBodies.filter((p) => p.url === CANDIDATURES_URL)).toEqual([
      { url: CANDIDATURES_URL, body: { equipeRefId: creee.id }, status: 201 },
    ]);
  });

  test("refuse un nom déjà pris avec « Cette équipe existe déjà », sans rien perdre de la saisie", async ({ page }) => {
    await ouvrirModale(page);

    await page.getByLabel("Nom court").fill("Rennes");
    await page.getByLabel("Nom complet du club (optionnel)").fill("Les Cormorans de Rennes");
    await page.getByRole("button", { name: "Soumettre" }).click();

    // Délai élargi : fetchWithRetry rejoue aujourd'hui aussi les refus 4xx (jusqu'à
    // 3 nouvelles tentatives, 3,5 à 5 s d'attente) avant de rendre l'erreur.
    await expect(page.getByText("Cette équipe existe déjà")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Ajouter une équipe" })).toBeVisible();
    await expect(page.getByLabel("Nom court")).toHaveValue("Rennes");
    await expect(page.getByLabel("Nom complet du club (optionnel)")).toHaveValue(
      "Les Cormorans de Rennes",
    );

    // Toutes les tentatives de création ont été refusées ; rien n'a été créé ni candidaté.
    const creations = mock.postBodies.filter((p) => p.url === EQUIPES_URL);
    expect(creations.length).toBeGreaterThanOrEqual(1);
    expect(creations.every((p) => p.status === 409)).toBe(true);
    expect(mock.getEquipes()).toHaveLength(EQUIPES.length);
    expect(mock.postBodies.filter((p) => p.url === CANDIDATURES_URL)).toEqual([]);
  });

  test("refuse un emoji dans le nom complet, garde la saisie, puis accepte la saisie corrigée", async ({ page }) => {
    await ouvrirModale(page);

    await page.getByLabel("Nom court").fill("Trois-Chêne 2");
    await page.getByLabel("Nom complet du club (optionnel)").fill("Les 🦊 Trois-Chêne");
    await page.getByRole("button", { name: "Soumettre" }).click();

    // Délai élargi : même cause que pour le doublon (refus 4xx rejoué par fetchWithRetry).
    await expect(page.getByText("Le nom ne doit pas contenir d'emoji")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel("Nom court")).toHaveValue("Trois-Chêne 2");
    await expect(page.getByLabel("Nom complet du club (optionnel)")).toHaveValue(
      "Les 🦊 Trois-Chêne",
    );
    expect(mock.getEquipes()).toHaveLength(EQUIPES.length);

    // Le responsable corrige et renvoie : la création aboutit, sans rouvrir la modale.
    await page.getByLabel("Nom complet du club (optionnel)").fill("Les Renards de Trois-Chêne 2");
    await page.getByRole("button", { name: "Soumettre" }).click();

    await expect(page.getByRole("heading", { name: "Ajouter une équipe" })).toBeHidden();
    await expect(page.getByRole("button", { name: /Trois-Chêne 2/ })).toContainText(
      "Les Renards de Trois-Chêne 2",
    );
    expect(mock.getEquipes()).toHaveLength(EQUIPES.length + 1);
    await expect(page.getByRole("button", { name: "Lancer la demande" })).toBeEnabled();
  });

  test("un nom complet identique au nom court n'est pas gardé : l'équipe s'affiche sur une ligne", async ({ page }) => {
    await ouvrirModale(page);

    await page.getByLabel("Nom court").fill("Meudon");
    await page.getByLabel("Nom complet du club (optionnel)").fill("meudon");
    await page.getByRole("button", { name: "Soumettre" }).click();

    await expect(page.getByRole("heading", { name: "Ajouter une équipe" })).toBeHidden();
    // Le front envoie la saisie telle quelle ; c'est le back qui décide de ne pas la garder.
    expect(mock.postBodies.at(-1)).toEqual({
      url: EQUIPES_URL,
      body: { nom: "Meudon", nomComplet: "meudon" },
      status: 201,
    });
    await expect(page.getByRole("button", { name: /Meudon/ })).toHaveText(/^Meudon\s*▾$/);
  });

  test("l'équipe créée est retrouvée par son nom complet dans le sélecteur", async ({ page }) => {
    await ouvrirModale(page);
    await page.getByLabel("Nom court").fill("San Jose");
    await page.getByLabel("Nom complet du club (optionnel)").fill("Les Sharks de San Jose");
    await page.getByRole("button", { name: "Soumettre" }).click();
    await expect(page.getByRole("heading", { name: "Ajouter une équipe" })).toBeHidden();

    await page.getByRole("button", { name: /San Jose/ }).click();
    const recherche = page.getByPlaceholder("Rechercher...");
    const options = recherche.locator("..").locator("..").getByRole("button");
    await recherche.fill("sharks");

    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText("San Jose");

    // Les équipes d'origine sont toujours là.
    await recherche.fill("");
    await expect(options).toHaveCount(EQUIPES.length + 1);
  });

  // Comportement attendu, pas encore vrai : fetchWithRetry (front/src/api/fetchWithRetry.ts)
  // relance le ServerError d'un 4xx dans son propre try/catch et le rejoue comme une panne.
  // Constaté ici : 4 POST /inscription/equipes pour un seul clic. Hors périmètre de cette
  // feature (le correctif touche tous les appels d'API) — voir le fichier de suivi.
  test.fixme("n'envoie la création qu'une seule fois quand le back la refuse (409)", async ({ page }) => {
    await ouvrirModale(page);

    await page.getByLabel("Nom court").fill("Rennes");
    await page.getByRole("button", { name: "Soumettre" }).click();

    await expect(page.getByText("Cette équipe existe déjà")).toBeVisible({ timeout: 15_000 });
    expect(mock.postBodies.map((p) => [p.url, p.status])).toEqual([[EQUIPES_URL, 409]]);
  });
});

test.describe("Liste des candidatures de l'organisateur — nom complet", () => {
  let mock: MockBackHandle;

  test.afterEach(async () => {
    await mock.close();
  });

  test.beforeEach(async ({ page }) => {
    mock = await startMockBack(MOCK_PORT, {
      organisateur: true,
      editionEtape: "INSCRIPTIONS_OUVERTES",
      candidatures: [
        {
          id: 1,
          equipeNom: "Courbevoie",
          equipeNomComplet: "Les Coqs de Courbevoie",
          statut: "CANDIDATE",
          utilisateurEmail: "courbevoie@club.fr",
          createdAt: "2026-03-01T10:00:00.000Z",
        },
        {
          id: 2,
          equipeNom: "Rennes",
          equipeNomComplet: null,
          statut: "CANDIDATE",
          utilisateurEmail: "rennes@club.fr",
          createdAt: "2026-03-02T10:00:00.000Z",
        },
        {
          id: 3,
          equipeNom: "Orléans",
          equipeNomComplet: "Les Renards d'Orléans",
          statut: "VALIDEE",
          utilisateurEmail: "orleans@club.fr",
          createdAt: "2026-03-03T10:00:00.000Z",
        },
      ],
    });
    await page.addInitScript((token) => {
      localStorage.setItem("auth_token", token);
    }, fakeJwt("organisateur-1"));
    await page.goto("/inscription");
  });

  test("affiche le nom complet sous le nom court et permet de chercher une candidature par lui", async ({ page }) => {
    const compteur = page.getByText(/équipes? sur 3$/);
    await expect(compteur).toHaveText("3 équipes sur 3");
    await expect(page.getByText("Les Coqs de Courbevoie")).toBeVisible();
    await expect(page.getByText("Les Renards d'Orléans")).toBeVisible();

    const recherche = page.getByRole("searchbox");
    await recherche.fill("coqs");
    await expect(compteur).toHaveText("1 équipe sur 3");
    await expect(page.getByText("Courbevoie", { exact: true })).toBeVisible();
    await expect(page.getByText("Rennes", { exact: true })).toHaveCount(0);

    // Accents et casse ignorés, y compris dans le nom complet.
    await recherche.fill("RENARDS D'ORLEANS");
    await expect(compteur).toHaveText("1 équipe sur 3");
    await expect(page.getByText("Orléans", { exact: true })).toBeVisible();

    // Une candidature sans nom complet reste trouvable par son nom court.
    await recherche.fill("renn");
    await expect(compteur).toHaveText("1 équipe sur 3");
    await expect(page.getByText("Rennes", { exact: true })).toBeVisible();
  });

  test("garde la recherche par nom complet après rechargement de la page", async ({ page }) => {
    await page.getByRole("searchbox").fill("coqs");
    await expect(page.getByText(/équipes? sur 3$/)).toHaveText("1 équipe sur 3");

    await page.reload();

    await expect(page.getByText(/équipes? sur 3$/)).toHaveText("1 équipe sur 3");
    await expect(page.getByRole("searchbox")).toHaveValue("coqs");
    await expect(page.getByText("Les Coqs de Courbevoie")).toBeVisible();
  });
});
