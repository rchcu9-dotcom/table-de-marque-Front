import { test, expect, type Page } from "@playwright/test";
import { startMockBack, type MockBackHandle, type MockCandidature } from "../mocks/mock-back";

const MOCK_PORT = 4000;

/** JWT non signé : le front n'en décode que le payload (cf. AuthContext.tokenToUser). */
function fakeJwt(sub: string): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64({ sub, email: "orga@rchc.fr" })}.sig`;
}

const CANDIDATURES: MockCandidature[] = [
  { id: 1, equipeNom: "Rennes", statut: "DOSSIER_COMPLET", utilisateurEmail: "a@x.fr", createdAt: "2026-03-01T10:00:00.000Z" },
  { id: 2, equipeNom: "Cormeilles", statut: "DOSSIER_EN_COURS", utilisateurEmail: "b@x.fr", createdAt: "2026-03-02T10:00:00.000Z" },
  { id: 3, equipeNom: "Nantes", statut: "PAIEMENT_ATTENDU", utilisateurEmail: "c@x.fr", createdAt: "2026-03-03T10:00:00.000Z" },
];

test.describe("Pilotage du tournoi depuis l'accueil admin (organisateur)", () => {
  let mock: MockBackHandle;

  test.afterEach(async () => {
    await mock.close();
  });

  async function ouvrirAccueilAdmin(page: Page, etape: string) {
    mock = await startMockBack(MOCK_PORT, {
      organisateur: true,
      editionEtape: etape,
      candidatures: CANDIDATURES,
    });
    await page.addInitScript((token) => {
      localStorage.setItem("auth_token", token);
    }, fakeJwt("organisateur-1"));
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Pilotage du tournoi" })).toBeVisible();
  }

  const etapeCourante = (page: Page) => page.locator('li[aria-current="step"]');

  test("cycle complet : ouvrir → clôturer → rouvrir → clôturer → lancer", async ({ page }) => {
    await ouvrirAccueilAdmin(page, "CREEE");

    // 1. Préparation : état des lieux, ouverture sans confirmation.
    await expect(etapeCourante(page)).toContainText("Préparation");
    await expect(page.getByText("Paramètres sportifs remplis")).toBeVisible();
    await page.getByRole("button", { name: "Ouvrir les inscriptions" }).click();
    await expect(etapeCourante(page)).toContainText("Inscriptions ouvertes");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(mock.getEtape()).toBe("INSCRIPTIONS_OUVERTES");

    // 2. Inscriptions ouvertes : compteurs, clôture avec confirmation simple.
    await expect(page.getByText("Équipes retenues : 2/16")).toBeVisible();
    await expect(page.getByText("Paiements attendus : 1")).toBeVisible();
    await page.getByRole("button", { name: "Clôturer les inscriptions" }).click();
    const cloture = page.getByRole("dialog", { name: "Clôturer les inscriptions ?" });
    await expect(cloture).toBeVisible();
    expect(mock.getEtape()).toBe("INSCRIPTIONS_OUVERTES");
    await cloture.getByRole("button", { name: "Confirmer" }).click();
    await expect(etapeCourante(page)).toContainText("Inscriptions clôturées");
    expect(mock.getEtape()).toBe("CLOTUREE");

    // 3. Rouvrir (action secondaire, confirmation simple) puis re-clôturer.
    await page.getByRole("button", { name: "Rouvrir les inscriptions" }).click();
    await page
      .getByRole("dialog", { name: "Rouvrir les inscriptions ?" })
      .getByRole("button", { name: "Confirmer" })
      .click();
    await expect(etapeCourante(page)).toContainText("Inscriptions ouvertes");
    await page.getByRole("button", { name: "Clôturer les inscriptions" }).click();
    await page.getByRole("button", { name: "Confirmer" }).click();
    await expect(etapeCourante(page)).toContainText("Inscriptions clôturées");

    // 4. Lancer le tournoi : confirmation forte avec les dossiers incomplets.
    await expect(page.getByText("Dossiers complets : 1/2")).toBeVisible();
    await expect(page.getByRole("link", { name: /Simulation de planning.*Utile maintenant/ })).toBeVisible();
    await page.getByRole("button", { name: "Lancer le tournoi" }).click();
    const lancement = page.getByRole("dialog", { name: "Lancer le tournoi ?" });
    await expect(lancement.getByRole("list", { name: "Dossiers incomplets" })).toContainText("Cormeilles");
    const confirmer = lancement.getByRole("button", { name: "Confirmer" });
    await expect(confirmer).toBeDisabled();
    await lancement.getByRole("checkbox").check();
    await confirmer.click();
    await expect(etapeCourante(page)).toContainText("Tournoi en cours");
    await expect(page.getByRole("button", { name: "Préparer la saison suivante" })).toBeVisible();
    expect(mock.getEtape()).toBe("TOURNOI_DEMARRE");

    expect(mock.posts.map((p) => p.url)).toEqual([
      "/inscription/editions/1/ouvrir-inscriptions",
      "/inscription/editions/1/cloturer-inscriptions",
      "/inscription/editions/1/ouvrir-inscriptions",
      "/inscription/editions/1/cloturer-inscriptions",
      "/inscription/editions/1/demarrer-tournoi",
    ]);
    for (const post of mock.posts) {
      expect(post.authorization).toMatch(/^Bearer /);
    }
    // Aucun code technique affiché.
    await expect(page.getByText(/CLOTUREE|TOURNOI_DEMARRE|INSCRIPTIONS_OUVERTES/)).toHaveCount(0);
  });

  test("annuler le lancement n'appelle pas le backend", async ({ page }) => {
    await ouvrirAccueilAdmin(page, "CLOTUREE");

    await page.getByRole("button", { name: "Lancer le tournoi" }).click();
    await page.getByRole("button", { name: "Annuler" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(mock.posts).toHaveLength(0);
  });

  test("Paramètres d'inscription : plus de switch, badge d'étape et lien vers l'accueil admin", async ({ page }) => {
    await ouvrirAccueilAdmin(page, "INSCRIPTIONS_OUVERTES");
    await page.goto("/admin/parametres-inscription");

    await expect(page.getByText("Dates du tournoi")).toBeVisible();
    await expect(page.getByRole("switch")).toHaveCount(0);
    await expect(page.getByText("Inscriptions ouvertes", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Fin des inscriptions")).toHaveCount(0);
    await page.getByRole("link", { name: "Changer d'étape depuis l'accueil admin" }).click();
    await expect(page.getByRole("heading", { name: "Pilotage du tournoi" })).toBeVisible();
  });
});
