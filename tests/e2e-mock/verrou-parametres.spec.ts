import { test, expect, type Page } from "@playwright/test";
import { startMockBack, type MockBackHandle, type MockCandidature } from "../mocks/mock-back";

const MOCK_PORT = 4000;

/** JWT non signé : le front n'en décode que le payload (cf. AuthContext.tokenToUser). */
function fakeJwt(sub: string): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64({ sub, email: "orga@rchc.fr" })}.sig`;
}

const MESSAGE_FORMULE_FIGEE = "La formule sportive n'est plus modifiable une fois le tournoi lancé.";
const MESSAGE_RETOUR_AVEC_CANDIDATURES =
  "Des équipes ont déjà candidaté sur ces paramètres : ils ne peuvent plus être modifiés.";

test.describe("Formule sportive modifiable jusqu'au lancement, paramètres d'inscription figés à l'ouverture", () => {
  let mock: MockBackHandle;

  test.afterEach(async () => {
    await mock.close();
  });

  async function connecter(page: Page, etape: string, candidatures: MockCandidature[] = []) {
    mock = await startMockBack(MOCK_PORT, { organisateur: true, editionEtape: etape, candidatures });
    await page.addInitScript((token) => {
      localStorage.setItem("auth_token", token);
    }, fakeJwt("organisateur-1"));
  }

  test("Inscriptions ouvertes : les paramètres sportifs s'enregistrent, les paramètres d'inscription sont figés (CA 14)", async ({ page }) => {
    await connecter(page, "INSCRIPTIONS_OUVERTES");

    // 1. Paramètres sportifs : modifiables, le PUT est accepté.
    await page.goto("/admin/parametres-sportifs");
    const patinoires = page.getByLabel("Patinoires");
    await expect(patinoires).toBeEnabled();
    await expect(page.getByText(MESSAGE_FORMULE_FIGEE)).toHaveCount(0);
    await patinoires.fill("3");
    const formDurees = page.locator("form", { hasText: "Durées et patinoires" });
    await formDurees.getByRole("button", { name: "Enregistrer" }).click();
    await expect.poll(() => mock.puts.length).toBe(1);
    expect(mock.puts[0]).toMatchObject({
      url: "/parametres-sportifs/1",
      status: 200,
      body: expect.objectContaining({ nbPatinoires: 3 }),
    });

    // 2. Paramètres d'inscription : bandeau, champs désactivés, aucun Enregistrer.
    await page.goto("/admin/parametres-inscription");
    const bandeau = page.getByRole("status");
    await expect(bandeau).toContainText(
      "Inscriptions ouvertes : les paramètres d'inscription sont figés, car les équipes candidatent sur cette base.",
    );
    await expect(bandeau.getByRole("link", { name: "Revenir en préparation depuis l'accueil admin" })).toBeVisible();
    await expect(page.getByLabel("Nom du tournoi")).toBeDisabled();
    await expect(page.getByLabel("Frais d'inscription (€)")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Enregistrer" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ajouter" })).toHaveCount(0);

    // Touche Entrée dans un champ : aucun PATCH émis.
    await page.getByLabel("Nom du tournoi").press("Enter");
    await page.waitForTimeout(300);
    expect(mock.patches.filter((p) => p.url === "/inscription/editions/1")).toHaveLength(0);

    // Le lien du bandeau ramène à l'accueil admin.
    await bandeau.getByRole("link", { name: "Revenir en préparation depuis l'accueil admin" }).click();
    await expect(page.getByRole("heading", { name: "Pilotage du tournoi" })).toBeVisible();
  });

  test("Tournoi en cours : paramètres sportifs en lecture seule, sans ?edition=demarree (CA 3)", async ({ page }) => {
    await connecter(page, "TOURNOI_DEMARRE");

    await page.goto("/admin/parametres-sportifs");
    await expect(page.getByRole("status")).toContainText(MESSAGE_FORMULE_FIGEE);
    await expect(page.getByRole("status").getByRole("link", { name: "Accueil admin" })).toBeVisible();
    await expect(page.getByLabel("Patinoires")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Enregistrer" })).toHaveCount(0);
    expect(mock.puts).toHaveLength(0);
  });

  test("Revenir en préparation sans candidature : les paramètres d'inscription redeviennent modifiables (CA 7)", async ({ page }) => {
    await connecter(page, "INSCRIPTIONS_OUVERTES");

    await page.goto("/admin");
    await page.getByRole("button", { name: "Revenir en préparation" }).click();
    const dialog = page.getByRole("dialog", { name: "Revenir en préparation ?" });
    await expect(dialog).toContainText(
      "Les équipes ne pourront plus candidater tant que les inscriptions ne sont pas rouvertes.",
    );
    await dialog.getByRole("button", { name: "Confirmer" }).click();

    await expect(page.locator('li[aria-current="step"]')).toContainText("Préparation");
    expect(mock.getEtape()).toBe("CREEE");
    expect(mock.posts.map((p) => p.url)).toContain("/inscription/editions/1/revenir-en-preparation");

    await page.goto("/admin/parametres-inscription");
    await expect(page.getByLabel("Nom du tournoi")).toBeEnabled();
    await expect(page.getByRole("button", { name: "Enregistrer" })).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("Revenir en préparation avec une candidature : action désactivée et motif affiché (CA 9)", async ({ page }) => {
    await connecter(page, "INSCRIPTIONS_OUVERTES", [
      { id: 1, equipeNom: "Rennes", statut: "REFUSEE", utilisateurEmail: "a@x.fr", createdAt: "2026-03-01T10:00:00.000Z" },
    ]);

    await page.goto("/admin");
    await expect(page.getByText(MESSAGE_RETOUR_AVEC_CANDIDATURES)).toBeVisible();
    await expect(page.getByRole("button", { name: "Revenir en préparation" })).toBeDisabled();
    expect(mock.posts).toHaveLength(0);
  });
});
