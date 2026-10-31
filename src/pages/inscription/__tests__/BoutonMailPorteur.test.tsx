import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type {
  CandidatureOrganisateur,
  Edition,
  EditionEtape,
} from "../../../api/types/inscription.types";
import { BoutonMailPorteur } from "../BoutonMailPorteur";

const TEXTE_LONG = "é".repeat(400);

function edition(valeurs: Partial<Edition> = {}): Edition {
  return {
    categorie: "U11",
    fraisInscription: 300,
    hasImageRib: false,
    contactEmail: "responsable@tournoi.fr",
    msgListeAttente: "Tu es sur liste d'attente.",
    ...valeurs,
  } as Edition;
}

function candidature(
  valeurs: Partial<CandidatureOrganisateur> = {},
): Pick<CandidatureOrganisateur, "statut" | "utilisateurEmail"> {
  return { statut: "LISTE_ATTENTE", utilisateurEmail: "porteur@club.fr", ...valeurs };
}

function rendre(
  valeurs: {
    edition?: Edition | null;
    candidature?: Partial<CandidatureOrganisateur>;
    etape?: EditionEtape | null;
    ouvrir?: (href: string) => void;
  } = {},
) {
  return render(
    <BoutonMailPorteur
      candidature={candidature(valeurs.candidature)}
      edition={valeurs.edition === undefined ? edition() : valeurs.edition}
      etape={valeurs.etape ?? "INSCRIPTIONS_OUVERTES"}
      ouvrir={valeurs.ouvrir}
    />,
  );
}

const lien = () => screen.getByRole("link", { name: /Mail au porteur/ });

function simulerPressePapiers(writeText?: (texte: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

describe("BoutonMailPorteur — affichage", () => {
  it("affiche le libellé, avec l'objet en infobulle et dans le nom accessible", () => {
    rendre();
    const objet = "Vous êtes sur liste d'attente du tournoi RCHC U11";

    expect(lien()).toHaveTextContent("✉ Mail au porteur");
    expect(lien()).toHaveAttribute("title", objet);
    expect(lien()).toHaveAccessibleName(`Mail au porteur : ${objet}`);
  });

  it("porte le mail complet dans href", () => {
    rendre();
    const href = lien().getAttribute("href")!;

    expect(href).toContain("mailto:porteur@club.fr?");
    expect(href).toContain("cc=responsable@tournoi.fr");
    expect(decodeURIComponent(href)).toContain("Vous êtes sur liste d'attente du tournoi RCHC U11");
  });

  it("n'ouvre pas de nouvel onglet", () => {
    rendre();

    expect(lien()).not.toHaveAttribute("target");
  });

  it("reste affiché sans contactEmail (critère 12)", () => {
    rendre({ edition: edition({ contactEmail: undefined }) });

    expect(lien().getAttribute("href")).not.toContain("cc=");
  });

  it("n'affiche rien sans édition", () => {
    const { container } = rendre({ edition: null });

    expect(container).toBeEmptyDOMElement();
  });

  it.each([[""], ["   "], [null]])("n'affiche rien avec l'adresse %j", (utilisateurEmail) => {
    const { container } = rendre({
      candidature: { utilisateurEmail: utilisateurEmail as string },
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("suit le statut reçu (critère 6)", () => {
    const { rerender } = rendre();
    expect(lien()).toHaveAttribute("title", "Vous êtes sur liste d'attente du tournoi RCHC U11");

    rerender(
      <BoutonMailPorteur
        candidature={candidature({ statut: "REFUSEE" })}
        edition={edition()}
        etape="INSCRIPTIONS_OUVERTES"
      />,
    );

    expect(lien()).toHaveAttribute(
      "title",
      "Votre demande d'inscription au tournoi RCHC U11 n'a pas pu être retenue",
    );
  });
});

describe("BoutonMailPorteur — cas courant", () => {
  it("laisse le navigateur suivre le lien, sans copie", () => {
    const writeText = vi.fn();
    const ouvrir = vi.fn();
    simulerPressePapiers(writeText);
    rendre({ ouvrir });

    const clic = createEvent.click(lien());
    fireEvent(lien(), clic);

    expect(clic.defaultPrevented).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    expect(ouvrir).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("BoutonMailPorteur — mode long", () => {
  const editionLongue = edition({ msgListeAttente: TEXTE_LONG });

  afterEach(() => {
    simulerPressePapiers(undefined);
  });

  it("le lien ne contient pas le texte", () => {
    rendre({ edition: editionLongue });

    expect(lien().getAttribute("href")).not.toContain("body=");
  });

  it("copie le texte complet, ouvre la messagerie sans le texte et l'indique (critère 15)", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const ouvrir = vi.fn();
    simulerPressePapiers(writeText);
    rendre({ edition: editionLongue, ouvrir });

    const clic = createEvent.click(lien());
    fireEvent(lien(), clic);

    expect(clic.defaultPrevented).toBe(true);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Texte copié : colle-le dans le mail.",
    );
    expect(writeText).toHaveBeenCalledWith(TEXTE_LONG);
    expect(ouvrir).toHaveBeenCalledTimes(1);
    expect(ouvrir.mock.calls[0][0]).toBe(lien().getAttribute("href"));
    expect(ouvrir.mock.calls[0][0]).toContain("cc=responsable@tournoi.fr");
    expect(ouvrir.mock.calls[0][0]).toContain("subject=");
    expect(ouvrir.mock.calls[0][0]).not.toContain("body=");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("n'ouvre la messagerie qu'une fois la copie terminée", async () => {
    let terminerCopie = () => {};
    const ouvrir = vi.fn();
    simulerPressePapiers(() => new Promise((resolve) => (terminerCopie = resolve)));
    rendre({ edition: editionLongue, ouvrir });

    fireEvent.click(lien());
    await Promise.resolve();
    expect(ouvrir).not.toHaveBeenCalled();

    terminerCopie();
    await waitFor(() => expect(ouvrir).toHaveBeenCalledTimes(1));
  });

  it("ouvre quand même si la copie est refusée, et affiche le texte (critère 16)", async () => {
    const ouvrir = vi.fn();
    simulerPressePapiers(vi.fn().mockRejectedValue(new Error("refus")));
    rendre({ edition: editionLongue, ouvrir });

    fireEvent.click(lien());

    expect(await screen.findByRole("status")).toHaveTextContent("Copie impossible");
    expect(ouvrir).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox", { name: "Texte du mail" })).toHaveValue(TEXTE_LONG);
    expect(screen.getByRole("textbox", { name: "Texte du mail" })).toHaveAttribute("readonly");
  });

  it("sélectionne le texte affiché, prêt à copier", async () => {
    simulerPressePapiers(vi.fn().mockRejectedValue(new Error("refus")));
    rendre({ edition: editionLongue, ouvrir: vi.fn() });

    fireEvent.click(lien());
    const zone = await screen.findByRole<HTMLTextAreaElement>("textbox");

    expect(zone.selectionStart).toBe(0);
    expect(zone.selectionEnd).toBe(TEXTE_LONG.length);
  });

  it("traite l'absence de navigator.clipboard comme un échec (critère 16)", async () => {
    const ouvrir = vi.fn();
    simulerPressePapiers(undefined);
    rendre({ edition: editionLongue, ouvrir });

    fireEvent.click(lien());

    expect(await screen.findByRole("textbox")).toHaveValue(TEXTE_LONG);
    expect(ouvrir).toHaveBeenCalledTimes(1);
  });

  it("n'expose pas de zone de texte avant le clic", () => {
    simulerPressePapiers(vi.fn());
    rendre({ edition: editionLongue, ouvrir: vi.fn() });

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("BoutonMailPorteur — ouverture par défaut", () => {
  beforeEach(() => {
    simulerPressePapiers(vi.fn().mockResolvedValue(undefined));
  });

  afterEach(() => {
    simulerPressePapiers(undefined);
    vi.unstubAllGlobals();
  });

  it("en mode long, sans `ouvrir`, navigue vers le lien", async () => {
    const emplacement = { href: "", origin: "https://site.example" };
    vi.stubGlobal("location", emplacement);
    rendre({ edition: edition({ msgListeAttente: TEXTE_LONG }) });
    const attendu = lien().getAttribute("href");

    fireEvent.click(lien());

    await waitFor(() => expect(emplacement.href).toBe(attendu));
  });
});
