import { test, expect } from "@playwright/test";
import { startMockBack, type MockBackHandle } from "../mocks/mock-back";

const MOCK_PORT = 4000;

/** JWT non signé : le front n'en décode que le payload (cf. AuthContext.tokenToUser). */
function fakeJwt(sub: string): string {
  const b64 = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64({ sub, email: "orga@rchc.fr" })}.sig`;
}

test.describe("Switch « Inscriptions ouvertes / fermées » (organisateur)", () => {
  let mock: MockBackHandle;

  test.afterEach(async () => {
    await mock.close();
  });

  async function ouvrirParametres(page: import("@playwright/test").Page, etape: string) {
    mock = await startMockBack(MOCK_PORT, { organisateur: true, editionEtape: etape });
    await page.addInitScript((token) => {
      localStorage.setItem("auth_token", token);
    }, fakeJwt("organisateur-1"));
    await page.goto("/admin/parametres-inscription");
    return page.getByRole("switch");
  }

  test("parcours ouvrir → fermer → rouvrir avec les confirmations attendues", async ({ page }) => {
    const toggle = await ouvrirParametres(page, "CREEE");

    // 1. Ouverture initiale : aucune confirmation.
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText("Les inscriptions ne sont pas encore ouvertes.")).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(mock.getEtape()).toBe("INSCRIPTIONS_OUVERTES");

    // 2. Fermeture : modale factuelle, rien n'est appelé avant confirmation.
    await toggle.click();
    const modaleFermeture = page.getByRole("dialog", { name: "Fermer les inscriptions ?" });
    await expect(modaleFermeture).toBeVisible();
    await expect(modaleFermeture.getByRole("listitem")).toHaveCount(4);
    expect(mock.getEtape()).toBe("INSCRIPTIONS_OUVERTES");
    await modaleFermeture.getByRole("button", { name: "Confirmer" }).click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText("Les inscriptions sont clôturées.")).toBeVisible();
    expect(mock.getEtape()).toBe("CLOTUREE");

    // 3. Réouverture : confirmation d'une ligne.
    await toggle.click();
    const modaleReouverture = page.getByRole("dialog", { name: "Rouvrir les inscriptions ?" });
    await expect(modaleReouverture).toContainText("Planning et Équipes");
    await modaleReouverture.getByRole("button", { name: "Confirmer" }).click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(mock.getEtape()).toBe("INSCRIPTIONS_OUVERTES");

    // Tous les appels portent le jeton organisateur et visent les routes dédiées.
    expect(mock.posts.map((p) => p.url)).toEqual([
      "/inscription/editions/1/ouvrir-inscriptions",
      "/inscription/editions/1/cloturer-inscriptions",
      "/inscription/editions/1/ouvrir-inscriptions",
    ]);
    for (const post of mock.posts) {
      expect(post.authorization).toMatch(/^Bearer /);
    }
  });

  test("annuler la fermeture n'appelle pas le backend", async ({ page }) => {
    const toggle = await ouvrirParametres(page, "INSCRIPTIONS_OUVERTES");

    await toggle.click();
    await page.getByRole("button", { name: "Annuler" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(mock.posts).toHaveLength(0);
  });

  test("à TOURNOI_DEMARRE le switch est désactivé et aucun appel n'est possible", async ({ page }) => {
    const toggle = await ouvrirParametres(page, "TOURNOI_DEMARRE");

    await expect(toggle).toHaveAttribute("aria-disabled", "true");
    await expect(
      page.getByText("Le tournoi a démarré, les inscriptions ne peuvent plus être rouvertes"),
    ).toBeVisible();
    await toggle.click({ force: true });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(mock.posts).toHaveLength(0);
  });

  test("le champ « Fin des inscriptions » n'existe plus", async ({ page }) => {
    await ouvrirParametres(page, "INSCRIPTIONS_OUVERTES");

    await expect(page.getByText("Dates du tournoi")).toBeVisible();
    await expect(page.getByLabel("Fin des inscriptions")).toHaveCount(0);
  });
});
