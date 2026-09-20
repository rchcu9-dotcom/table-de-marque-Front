import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { TriageStatutSwitch } from "../TriageStatutSwitch";
import type { CandidatureOrganisateur } from "../../../api/types/inscription.types";

function baseCandidature(
  overrides: Partial<CandidatureOrganisateur> = {},
): CandidatureOrganisateur {
  return {
    id: 1,
    equipeNom: "Rennes",
    equipeLogoUrl: null,
    utilisateurEmail: "coach@example.com",
    utilisateurDisplayName: "Coach Dupont",
    statut: "CANDIDATE",
    createdAt: "2026-04-01T00:00:00.000Z",
    nbJoueurs: 0,
    fraisInscriptionPaye: false,
    repasPaiementRecu: false,
    repasDatePaiement: null,
    repasModePaiement: null,
    commentaireOrganisateur: null,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TriageStatutSwitch — rendu par statut (AC1, AC2, AC9)", () => {
  it("affiche les 3 segments à taille et couleur pleines égales pour le statut CANDIDATE (AC1)", () => {
    render(
      <TriageStatutSwitch
        candidature={baseCandidature({ statut: "CANDIDATE" })}
        peutAccepter={true}
        onChangerStatut={vi.fn()}
      />,
    );

    const accepte = screen.getByRole("button", { name: "Accepté" });
    const attente = screen.getByRole("button", { name: "Liste d'attente" });
    const refuse = screen.getByRole("button", { name: "Refusé" });

    for (const btn of [accepte, attente, refuse]) {
      expect(btn.className).toContain("px-3 py-1.5");
      expect(btn.className).toContain("text-xs");
      expect(btn.className).not.toContain("opacity-70");
    }
    expect(accepte.className).toContain("bg-green-600");
    expect(attente.className).toContain("bg-orange-500");
    expect(refuse.className).toContain("bg-red-600");
  });

  it("affiche le segment Refusé en grand et les 2 autres réduits/pâles pour le statut REFUSEE, tous cliquables (AC2)", () => {
    render(
      <TriageStatutSwitch
        candidature={baseCandidature({ statut: "REFUSEE" })}
        peutAccepter={true}
        onChangerStatut={vi.fn()}
      />,
    );

    const accepte = screen.getByRole("button", { name: "Accepté" });
    const attente = screen.getByRole("button", { name: "Liste d'attente" });
    const refuse = screen.getByRole("button", { name: "Refusé" });

    expect(refuse.className).toContain("px-3 py-1.5");
    expect(refuse.className).toContain("bg-red-600");

    for (const btn of [accepte, attente]) {
      expect(btn.className).toContain("px-2 py-1");
      expect(btn.className).toContain("opacity-70");
      expect(btn).not.toBeDisabled();
    }
    expect(accepte.className).toContain("bg-green-500/20");
    expect(attente.className).toContain("bg-orange-500/20");
  });

  it.each([
    ["PAIEMENT_ATTENDU", "Accepté"],
    ["LISTE_ATTENTE", "Liste d'attente"],
  ] as const)(
    "affiche le segment %s en grand quand c'est le statut courant (AC9)",
    (statut, label) => {
      render(
        <TriageStatutSwitch
          candidature={baseCandidature({ statut })}
          peutAccepter={true}
          onChangerStatut={vi.fn()}
        />,
      );

      const actif = screen.getByRole("button", { name: label });
      expect(actif.className).toContain("px-3 py-1.5");
      expect(actif.className).not.toContain("opacity-70");
    },
  );
});

describe("TriageStatutSwitch — bascule de statut (AC3, AC7)", () => {
  it("appelle onChangerStatut directement sans confirmation depuis CANDIDATE (première décision)", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const onChangerStatut = vi.fn();
    render(
      <TriageStatutSwitch
        candidature={baseCandidature({ id: 7, statut: "CANDIDATE" })}
        peutAccepter={true}
        onChangerStatut={onChangerStatut}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Refusé" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onChangerStatut).toHaveBeenCalledWith(7, "REFUSEE");
  });

  it("demande confirmation puis appelle onChangerStatut si confirmé, en rebasculant depuis un statut déjà décidé (AC3)", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onChangerStatut = vi.fn();
    render(
      <TriageStatutSwitch
        candidature={baseCandidature({ id: 9, equipeNom: "Nantes", statut: "REFUSEE" })}
        peutAccepter={true}
        onChangerStatut={onChangerStatut}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accepté" }));

    expect(window.confirm).toHaveBeenCalledWith(
      "Faire passer Nantes de Refusé à Accepté ?",
    );
    expect(onChangerStatut).toHaveBeenCalledWith(9, "PAIEMENT_ATTENDU");
  });

  it("n'appelle pas onChangerStatut si la confirmation est annulée", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onChangerStatut = vi.fn();
    render(
      <TriageStatutSwitch
        candidature={baseCandidature({ statut: "REFUSEE" })}
        peutAccepter={true}
        onChangerStatut={onChangerStatut}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accepté" }));

    expect(onChangerStatut).not.toHaveBeenCalled();
  });

  it("ne déclenche aucun appel réseau ni confirmation au clic sur le segment déjà actif (AC7)", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const onChangerStatut = vi.fn();
    render(
      <TriageStatutSwitch
        candidature={baseCandidature({ statut: "LISTE_ATTENTE" })}
        peutAccepter={true}
        onChangerStatut={onChangerStatut}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Liste d'attente" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onChangerStatut).not.toHaveBeenCalled();
  });
});

describe("TriageStatutSwitch — désactivation du segment Accepté (AC4)", () => {
  it("désactive visuellement le segment Accepté quand peutAccepter=false depuis un autre statut", () => {
    const onChangerStatut = vi.fn();
    render(
      <TriageStatutSwitch
        candidature={baseCandidature({ statut: "LISTE_ATTENTE" })}
        peutAccepter={false}
        onChangerStatut={onChangerStatut}
      />,
    );

    const accepte = screen.getByRole("button", { name: "Accepté" });
    expect(accepte).toBeDisabled();
    expect(accepte).toHaveAttribute("title", "Capacité maximale atteinte");

    fireEvent.click(accepte);
    expect(onChangerStatut).not.toHaveBeenCalled();
  });

  it("n'affiche pas le segment Accepté comme désactivé quand il est déjà le statut courant, même si peutAccepter=false", () => {
    render(
      <TriageStatutSwitch
        candidature={baseCandidature({ statut: "PAIEMENT_ATTENDU" })}
        peutAccepter={false}
        onChangerStatut={vi.fn()}
      />,
    );

    const accepte = screen.getByRole("button", { name: "Accepté" });
    expect(accepte).not.toBeDisabled();
  });
});
