import { test, expect, type Page } from "@playwright/test";
import { startMockBack, type MockBackHandle, type MockDossier } from "../mocks/mock-back";

const MOCK_PORT = 4000;

/** JWT non signé : le front n'en décode que le payload (cf. AuthContext.tokenToUser). */
function fakeJwt(sub: string): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64({ sub, email: "orga@rchc.fr" })}.sig`;
}

const CANDIDATURES = [
  { id: 1, equipeNom: "Rouen", statut: "CANDIDATE", utilisateurEmail: "rouen@club.fr", createdAt: "2026-03-01T10:00:00.000Z" },
  { id: 2, equipeNom: "Cormeilles-en-Parisis", statut: "DOSSIER_EN_COURS", utilisateurEmail: "cormeilles@club.fr", createdAt: "2026-03-02T10:00:00.000Z" },
  { id: 3, equipeNom: "Amiens", statut: "VALIDEE", utilisateurEmail: "amiens@club.fr", createdAt: "2026-03-03T10:00:00.000Z" },
  { id: 4, equipeNom: "Évry", statut: "PAIEMENT_ATTENDU", utilisateurEmail: "evry@club.fr", createdAt: "2026-03-04T10:00:00.000Z" },
  { id: 5, equipeNom: "Brest", statut: "REFUSEE", utilisateurEmail: "brest@club.fr", createdAt: "2026-03-05T10:00:00.000Z" },
];

const DOSSIERS: Record<number, MockDossier> = {
  2: {
    joueurs: [
      { id: 21, nom: "Émery", prenom: "Zoé", numero: 7, poste: "ATT", anneeNaissance: 2015 },
      { id: 22, nom: "Bossy", prenom: "Mike", numero: 22, poste: "DEF", anneeNaissance: 2015 },
      { id: 23, nom: "Bossy", prenom: "Adam", numero: 10, poste: "GB", anneeNaissance: 2016 },
    ],
    coachs: [{ id: 1, nom: "Bowman", prenom: "Scotty", presenceRepas: true }],
    droitsImageAcceptes: true,
  },
};

/** Lignes du tableau des joueurs, sous la forme « Nom Prénom ». */
async function lignesJoueurs(panneau: ReturnType<Page["getByRole"]>) {
  const lignes = panneau.locator("tbody tr");
  const n = await lignes.count();
  const noms: string[] = [];
  for (let i = 0; i < n; i++) {
    const cellules = lignes.nth(i).locator("td");
    const nom = (await cellules.nth(1).locator(":scope > :first-child, :scope").first().innerText()).split("\n")[0];
    noms.push(`${nom.trim()} ${(await cellules.nth(2).innerText()).trim()}`);
  }
  return noms;
}

test.describe("Liste admin des inscriptions et dossiers (organisateur)", () => {
  let mock: MockBackHandle;

  test.afterEach(async () => {
    await mock.close();
  });

  test.beforeEach(async ({ page }) => {
    mock = await startMockBack(MOCK_PORT, {
      organisateur: true,
      editionEtape: "CLOTUREE",
      candidatures: CANDIDATURES,
      dossiers: DOSSIERS,
    });
    await page.addInitScript((token) => {
      localStorage.setItem("auth_token", token);
    }, fakeJwt("organisateur-1"));
  });

  test("recherche et filtre dans la liste admin, conservés après F5", async ({ page }) => {
    await page.goto("/inscription");
    const compteur = page.getByText(/équipes? sur 5$/);
    await expect(compteur).toHaveText("5 équipes sur 5");
    const reservees = page.getByText("Équipes réservées").locator("..");
    await expect(reservees).toContainText("3 / 16");

    // Recherche insensible aux accents et à la casse.
    await page.getByRole("searchbox", { name: /Rechercher une équipe/ }).fill("EVRY");
    await expect(compteur).toHaveText("1 équipe sur 5");
    await expect(page.getByText("Évry", { exact: true })).toBeVisible();
    await expect(reservees).toContainText("3 / 16");

    // Effacer la recherche puis filtrer par deux statuts.
    await page.getByRole("button", { name: "Effacer la recherche" }).click();
    const statuts = page.getByRole("group", { name: "Filtrer par statut" });
    await statuts.getByRole("button", { name: /Validée \(1\)/ }).click();
    await statuts.getByRole("button", { name: /Dossier en cours \(1\)/ }).click();
    await expect(compteur).toHaveText("2 équipes sur 5");
    await expect(reservees).toContainText("3 / 16");
    await expect(page).toHaveURL(/statut=VALIDEE%2CDOSSIER_EN_COURS/);

    // F5 : les filtres survivent.
    await page.reload();
    await expect(page.getByText("2 équipes sur 5")).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Filtrer par statut" }).getByRole("button", { name: /Validée/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("ouvre un dossier, trie les joueurs, modifie un joueur et valide le dossier", async ({ page }) => {
    await page.goto("/inscription?q=cormeil");
    await expect(page.getByText("1 équipe sur 5")).toBeVisible();

    await page.getByRole("button", { name: "Voir le dossier" }).click();
    const panneau = page.getByRole("dialog", { name: "Dossier — Cormeilles-en-Parisis" });
    await expect(panneau).toBeVisible();
    await expect(page).toHaveURL(/dossier=2/);

    // Tri par défaut : nom puis prénom.
    await expect(panneau.locator("tbody tr")).toHaveCount(3);
    expect(await lignesJoueurs(panneau)).toEqual(["Bossy Adam", "Bossy Mike", "Émery Zoé"]);
    const enteteNumero = panneau.getByRole("columnheader", { name: /N°/ });
    await enteteNumero.getByRole("button").click();
    await expect(enteteNumero).toHaveAttribute("aria-sort", "ascending");
    expect(await lignesJoueurs(panneau)).toEqual(["Émery Zoé", "Bossy Adam", "Bossy Mike"]);
    await enteteNumero.getByRole("button").click();
    await expect(enteteNumero).toHaveAttribute("aria-sort", "descending");
    expect(await lignesJoueurs(panneau)).toEqual(["Bossy Mike", "Bossy Adam", "Émery Zoé"]);

    // Modifier un joueur via la route organisateur.
    await panneau.getByRole("button", { name: "Modifier Mike Bossy" }).click();
    const champNom = panneau.getByPlaceholder("Nom").first();
    await expect(champNom).toBeFocused();
    await champNom.fill("Bossy-Lemieux");
    await panneau.getByRole("button", { name: "Enregistrer" }).click();
    await expect(panneau.getByText("Bossy-Lemieux")).toBeVisible();
    expect(mock.patches.map((p) => p.url)).toContain("/inscription/dossier/candidature/2/joueurs/22");

    // Valider le dossier depuis le bandeau du panneau.
    await panneau.getByRole("button", { name: "Valider le dossier" }).click();
    await expect(panneau.getByRole("button", { name: "Rouvrir le dossier" })).toBeVisible();
    expect(mock.getCandidatures().find((c) => c.id === 2)?.statut).toBe("DOSSIER_COMPLET");
    // En DOSSIER_COMPLET l'organisateur garde la main.
    await expect(panneau.getByRole("button", { name: "Ajouter le joueur" })).toBeVisible();

    // Fermeture : retour à la liste avec le même filtre.
    await panneau.getByRole("button", { name: "Fermer" }).click();
    await expect(panneau).toHaveCount(0);
    await expect(page).toHaveURL(/\?q=cormeil$/);
    await expect(page.getByText("1 équipe sur 5")).toBeVisible();

    // Retour arrière puis avant : le panneau est adressé dans l'URL.
    await page.goForward();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("dialog", { name: "Dossier — Cormeilles-en-Parisis" })).toBeVisible();
  });
});
