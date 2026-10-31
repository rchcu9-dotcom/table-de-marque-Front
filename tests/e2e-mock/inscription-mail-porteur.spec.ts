import { test, expect, type Locator, type Page } from "@playwright/test";
import { startMockBack, type MockBackHandle, type MockCandidature } from "../mocks/mock-back";

const MOCK_PORT = 4000;
const CONTACT = "responsable@tournoi.fr";
const MSG_LISTE_ATTENTE = "Tu es sur liste d'attente.\nNous te préviendrons dès qu'une place se libère & c'est tout !";

/** JWT non signé : le front n'en décode que le payload (cf. AuthContext.tokenToUser). */
function fakeJwt(sub: string): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64({ sub, email: "orga@rchc.fr" })}.sig`;
}

const candidature = (overrides: Partial<MockCandidature> = {}): MockCandidature => ({
  id: 1,
  equipeNom: "Rouen",
  statut: "CANDIDATE",
  utilisateurEmail: "rouen@club.fr",
  createdAt: "2026-03-01T10:00:00.000Z",
  ...overrides,
});

const lienMail = (page: Page) => page.getByRole("link", { name: /Mail au porteur/ });

/** Relit le lien comme une messagerie : adresse, puis un champ par paramètre. */
async function lireMail(lien: Locator) {
  const href = (await lien.getAttribute("href"))!;
  const [adresse, requete] = href.slice("mailto:".length).split("?");
  const champs = requete.split("&").map((paire) => {
    const i = paire.indexOf("=");
    return [paire.slice(0, i), decodeURIComponent(paire.slice(i + 1))];
  });
  return { href, a: adresse, champs: Object.fromEntries(champs) as Record<string, string> };
}

test.describe("Mail au porteur (organisateur)", () => {
  let mock: MockBackHandle;

  async function ouvrir(
    page: Page,
    options: { candidatures?: MockCandidature[]; edition?: Record<string, unknown> } = {},
  ) {
    mock = await startMockBack(MOCK_PORT, {
      organisateur: true,
      editionEtape: "INSCRIPTIONS_OUVERTES",
      candidatures: options.candidatures ?? [candidature()],
      edition: { contactEmail: CONTACT, msgListeAttente: MSG_LISTE_ATTENTE, ...options.edition },
    });
    await page.addInitScript((token) => {
      localStorage.setItem("auth_token", token);
    }, fakeJwt("organisateur-1"));
    await page.goto("/inscription");
    await expect(lienMail(page)).toBeVisible();
  }

  test.afterEach(async () => {
    await mock.close();
  });

  test("après « Liste d'attente », le mail porte le message de liste d'attente (critère 1)", async ({ page }) => {
    await ouvrir(page);
    await expect(lienMail(page)).toHaveAttribute(
      "title",
      "Votre demande d'inscription au tournoi RCHC U11 a bien été reçue",
    );

    await page.getByRole("button", { name: "Liste d'attente" }).click();

    await expect(lienMail(page)).toHaveAttribute(
      "title",
      "Vous êtes sur liste d'attente du tournoi RCHC U11",
    );
    expect(mock.getCandidatures()[0].statut).toBe("LISTE_ATTENTE");

    const mail = await lireMail(lienMail(page));
    expect(mail.a).toBe("rouen@club.fr");
    expect(mail.champs.cc).toBe(CONTACT);
    expect(mail.champs.subject).toBe("Vous êtes sur liste d'attente du tournoi RCHC U11");
    expect(mail.champs.body).toBe(MSG_LISTE_ATTENTE.replace(/\n/g, "\r\n"));
    expect(mail.href).not.toContain("+");
  });

  test("cliquer sur le lien n'appelle pas l'API et ne change pas le statut (critère 18)", async ({ page }) => {
    await ouvrir(page, { candidatures: [candidature({ statut: "LISTE_ATTENTE" })] });
    const appels: string[] = [];
    page.on("request", (requete) => {
      if (requete.url().includes(":4000/")) appels.push(requete.url());
    });

    await lienMail(page).click();

    await expect(page).toHaveURL(/\/inscription/);
    await expect(lienMail(page)).toBeVisible();
    expect(appels).toEqual([]);
    expect(mock.patches).toEqual([]);
    expect(mock.getCandidatures()[0].statut).toBe("LISTE_ATTENTE");
  });

  test("mode long : vrai presse-papiers, puis indication sur la carte (critère 15)", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const texte = `${"Message très long à reprendre. ".repeat(40)}Fin.`;
    await ouvrir(page, {
      candidatures: [candidature({ statut: "LISTE_ATTENTE" })],
      edition: { msgListeAttente: texte },
    });

    const mail = await lireMail(lienMail(page));
    expect(mail.champs).not.toHaveProperty("body");
    expect(mail.champs.cc).toBe(CONTACT);

    await lienMail(page).click();

    await expect(page.getByText("Texte copié : colle-le dans le mail.")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(texte);
    await expect(page).toHaveURL(/\/inscription/);
  });

  test("copie refusée : le texte s'affiche sur la carte, sélectionné (critère 16)", async ({ page }) => {
    await page.addInitScript(() => {
      navigator.clipboard.writeText = () => Promise.reject(new Error("refus"));
    });
    const texte = `${"Message très long à reprendre. ".repeat(40)}Fin.`;
    await ouvrir(page, {
      candidatures: [candidature({ statut: "LISTE_ATTENTE" })],
      edition: { msgListeAttente: texte },
    });

    await lienMail(page).click();

    await expect(page.getByText("Copie impossible")).toBeVisible();
    const zone = page.getByRole("textbox", { name: "Texte du mail" });
    await expect(zone).toHaveValue(texte);
    expect(
      await zone.evaluate((el: HTMLTextAreaElement) => el.value.slice(el.selectionStart, el.selectionEnd)),
    ).toBe(texte);
  });
});
