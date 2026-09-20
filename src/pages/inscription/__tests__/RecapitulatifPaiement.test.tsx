import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import {
  RecapitulatifPaiementCarte,
  STATUTS_AVEC_RECAPITULATIF_PAIEMENT,
  TotauxPaiementGlobaux,
} from "../RecapitulatifPaiement";
import { formatFraisInscription } from "../../../utils/msgPaiementAttendu";
import type { CandidatureOrganisateur, Edition } from "../../../api/types/inscription.types";

// Intl.NumberFormat insère une espace insécable (U+00A0) avant « € » ; on
// normalise les espaces pour comparer des chaînes équivalentes après le
// collapse fait par Testing Library sur le texte du DOM (même pattern que
// InscriptionPage.paiementAttendu.test.tsx).
function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, " ");
}

// Matcher par contenu texte agrégé (le texte est réparti sur plusieurs noeuds
// enfants — nombres interpolés, espaces JSX). On ne retient que le noeud le
// plus profond dont le textContent contient la chaîne recherchée, sinon
// chaque ancêtre (dont le textContent agrège aussi ses enfants) matcherait
// également et ferait échouer `findByText` avec "multiple elements".
function textIncludes(expected: string) {
  const target = normalizeSpaces(expected);
  return (_: string, el: Element | null) => {
    if (!el) return false;
    const ownText = normalizeSpaces(el.textContent ?? "");
    if (!ownText.includes(target)) return false;
    return Array.from(el.children).every(
      (child) => !normalizeSpaces(child.textContent ?? "").includes(target),
    );
  };
}

function baseEdition(overrides: Partial<Edition> = {}): Edition {
  return {
    id: 1,
    nom: "RCHC U11 2026",
    categorie: "U11",
    annee: 2026,
    etape: "INSCRIPTIONS_OUVERTES",
    dateDebut: "2026-05-23T00:00:00",
    dateFinDebut: "2026-05-01T23:59:59",
    fraisInscription: 300,
    prixRepas: 12,
    nbPlacesMax: 16,
    hasImageRib: false,
    affichagePlanningPublic: false,
    anneesAge: [],
    ...overrides,
  };
}

function baseCandidature(
  overrides: Partial<CandidatureOrganisateur> = {},
): CandidatureOrganisateur {
  return {
    id: 1,
    equipeNom: "Rennes",
    equipeLogoUrl: null,
    utilisateurEmail: "coach@example.com",
    utilisateurDisplayName: "Coach Dupont",
    statut: "VALIDEE",
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

describe("RecapitulatifPaiementCarte", () => {
  it("affiche la date et le type de paiement du repas quand il est payé", () => {
    render(
      <RecapitulatifPaiementCarte
        candidature={baseCandidature({
          repasPaiementRecu: true,
          repasDatePaiement: "2026-09-10T00:00:00.000Z",
          repasModePaiement: "CHEQUE",
        })}
        edition={baseEdition()}
        onTogglePaiementRepas={vi.fn()}
      />,
    );

    expect(screen.getByText(/Payé le 1\d\/09\/2026 par chèque/)).toBeInTheDocument();
  });

  it("n'affiche aucun détail de paiement du repas tant qu'il n'est pas payé", () => {
    render(
      <RecapitulatifPaiementCarte
        candidature={baseCandidature({ repasPaiementRecu: false })}
        edition={baseEdition()}
        onTogglePaiementRepas={vi.fn()}
      />,
    );

    expect(screen.queryByText(/par (virement|chèque|autre)/)).not.toBeInTheDocument();
  });

  it("affiche « 3 joueur(s) × 12,00 € × 2 jours = 72,00 € » et le montant des frais d'inscription (AC1)", async () => {
    render(
      <RecapitulatifPaiementCarte
        candidature={baseCandidature({ nbJoueurs: 3 })}
        edition={baseEdition({ fraisInscription: 300, prixRepas: 12 })}
        onTogglePaiementRepas={vi.fn()}
      />,
    );

    await screen.findByText(
      textIncludes(
        `Repas — 3 joueur(s) × ${formatFraisInscription(12)} × 2 jours = ${formatFraisInscription(72)}`,
      ),
    );
    await screen.findByText(
      textIncludes(`Frais d'inscription — ${formatFraisInscription(300)}`),
    );
  });

  it("affiche le badge « Non payé » pour les frais d'inscription quand fraisInscriptionPaye=false (AC2)", () => {
    render(
      <RecapitulatifPaiementCarte
        candidature={baseCandidature({ fraisInscriptionPaye: false })}
        edition={baseEdition()}
        onTogglePaiementRepas={vi.fn()}
      />,
    );

    const badges = screen.getAllByText("Non payé");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("affiche le badge « Payé » pour les frais d'inscription quand fraisInscriptionPaye=true (AC3)", () => {
    render(
      <RecapitulatifPaiementCarte
        candidature={baseCandidature({ fraisInscriptionPaye: true, repasPaiementRecu: false })}
        edition={baseEdition()}
        onTogglePaiementRepas={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Payé").length).toBe(1);
    expect(screen.getAllByText("Non payé").length).toBe(1);
  });

  it("affiche 0 joueur et 0,00 € pour une candidature sans dossier créé, sans erreur (AC5)", async () => {
    render(
      <RecapitulatifPaiementCarte
        candidature={baseCandidature({ nbJoueurs: 0 })}
        edition={baseEdition({ prixRepas: 12 })}
        onTogglePaiementRepas={vi.fn()}
      />,
    );

    await screen.findByText(
      textIncludes(
        `Repas — 0 joueur(s) × ${formatFraisInscription(12)} × 2 jours = ${formatFraisInscription(0)}`,
      ),
    );
  });

  it("n'affiche rien quand edition est null (garde de robustesse)", () => {
    const { container } = render(
      <RecapitulatifPaiementCarte
        candidature={baseCandidature()}
        edition={null}
        onTogglePaiementRepas={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("appelle onTogglePaiementRepas avec l'id et l'inverse du statut courant au clic (AC10 — action de bascule)", () => {
    const onToggle = vi.fn();
    render(
      <RecapitulatifPaiementCarte
        candidature={baseCandidature({ id: 42, repasPaiementRecu: false })}
        edition={baseEdition()}
        onTogglePaiementRepas={onToggle}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Marquer le repas comme payé" }));

    expect(onToggle).toHaveBeenCalledWith(42, true);
  });

  it("propose « Marquer comme non payé » quand le repas est déjà marqué payé (correction d'une erreur)", () => {
    const onToggle = vi.fn();
    render(
      <RecapitulatifPaiementCarte
        candidature={baseCandidature({ id: 42, repasPaiementRecu: true })}
        edition={baseEdition()}
        onTogglePaiementRepas={onToggle}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Marquer comme non payé" }));

    expect(onToggle).toHaveBeenCalledWith(42, false);
  });

  describe("mode lecture seule (onTogglePaiementRepas absent — vue responsable)", () => {
    it("n'affiche aucun bouton, ni « Marquer le repas comme payé » ni « Marquer comme non payé » (AC7)", () => {
      const { rerender } = render(
        <RecapitulatifPaiementCarte
          candidature={baseCandidature({ repasPaiementRecu: false })}
          edition={baseEdition()}
        />,
      );
      expect(screen.queryByRole("button")).not.toBeInTheDocument();

      rerender(
        <RecapitulatifPaiementCarte
          candidature={baseCandidature({ repasPaiementRecu: true })}
          edition={baseEdition()}
        />,
      );
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("affiche la phrase d'aide sur la mise à jour par l'organisateur", () => {
      render(<RecapitulatifPaiementCarte candidature={baseCandidature()} edition={baseEdition()} />);

      expect(
        screen.getByText(
          "Le statut de paiement est mis à jour par l'organisateur à réception de votre règlement.",
        ),
      ).toBeInTheDocument();
    });

    it("affiche les mêmes montants et badges qu'en mode organisateur (AC1, AC3, AC4)", async () => {
      render(
        <RecapitulatifPaiementCarte
          candidature={baseCandidature({
            nbJoueurs: 3,
            fraisInscriptionPaye: false,
            repasPaiementRecu: true,
          })}
          edition={baseEdition({ fraisInscription: 300, prixRepas: 12 })}
        />,
      );

      await screen.findByText(
        textIncludes(`Frais d'inscription — ${formatFraisInscription(300)}`),
      );
      await screen.findByText(
        textIncludes(
          `Repas — 3 joueur(s) × ${formatFraisInscription(12)} × 2 jours = ${formatFraisInscription(72)}`,
        ),
      );
      expect(screen.getAllByText("Payé")).toHaveLength(1);
      expect(screen.getAllByText("Non payé")).toHaveLength(1);
    });

    it("accepte un sous-ensemble structurel (id + trois champs de paiement), sans champs organisateur", () => {
      render(
        <RecapitulatifPaiementCarte
          candidature={{ id: 7, nbJoueurs: 1, fraisInscriptionPaye: true, repasPaiementRecu: true }}
          edition={baseEdition()}
        />,
      );

      expect(screen.getAllByText("Payé")).toHaveLength(2);
      expect(screen.queryByText("Non payé")).not.toBeInTheDocument();
    });

    it("n'affiche pas la phrase d'aide en mode organisateur (non-régression AC10)", () => {
      render(
        <RecapitulatifPaiementCarte
          candidature={baseCandidature()}
          edition={baseEdition()}
          onTogglePaiementRepas={vi.fn()}
        />,
      );

      expect(screen.queryByText(/mis à jour par l'organisateur/)).not.toBeInTheDocument();
    });

    it("n'affiche rien quand edition est null, même en lecture seule", () => {
      const { container } = render(
        <RecapitulatifPaiementCarte candidature={baseCandidature()} edition={null} />,
      );
      expect(container).toBeEmptyDOMElement();
    });
  });
});

describe("STATUTS_AVEC_RECAPITULATIF_PAIEMENT (AC6)", () => {
  it("contient exactement RESERVEE, PAIEMENT_ATTENDU, VALIDEE, DOSSIER_EN_COURS, DOSSIER_COMPLET", () => {
    expect([...STATUTS_AVEC_RECAPITULATIF_PAIEMENT].sort()).toEqual(
      ["DOSSIER_COMPLET", "DOSSIER_EN_COURS", "PAIEMENT_ATTENDU", "RESERVEE", "VALIDEE"].sort(),
    );
  });

  it.each(["CANDIDATE", "LISTE_ATTENTE", "REFUSEE"] as const)("exclut %s", (statut) => {
    expect(STATUTS_AVEC_RECAPITULATIF_PAIEMENT).not.toContain(statut);
  });
});

describe("TotauxPaiementGlobaux (AC7 — totaux globaux en pied de liste)", () => {
  it("reflète exactement le nombre d'équipes payées et la somme des montants sur 16 équipes actives dont 8 payées", async () => {
    const candidatures: CandidatureOrganisateur[] = Array.from({ length: 16 }, (_, i) =>
      baseCandidature({
        id: i + 1,
        nbJoueurs: 2,
        fraisInscriptionPaye: i < 8,
        repasPaiementRecu: i < 8,
      }),
    );

    render(
      <TotauxPaiementGlobaux
        candidatures={candidatures}
        edition={baseEdition({ fraisInscription: 300, prixRepas: 12 })}
      />,
    );

    // Frais d'inscription : 8 payés sur 16, 8 * 300 = 2400 sur 16 * 300 = 4800
    await screen.findByText(
      textIncludes(
        `Frais d'inscription : 8 payés / ${formatFraisInscription(2400)} sur ${formatFraisInscription(4800)} attendus`,
      ),
    );

    // Repas : 2 joueurs * 12 € * 2 jours = 48 € par équipe ; 8 payés → 384 € sur 16*48=768 €
    await screen.findByText(
      textIncludes(
        `Repas : 8 payés / ${formatFraisInscription(384)} sur ${formatFraisInscription(768)} attendus`,
      ),
    );
  });

  it("n'affiche rien quand edition est null (garde de robustesse)", () => {
    const { container } = render(
      <TotauxPaiementGlobaux candidatures={[baseCandidature()]} edition={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("affiche des totaux à 0 quand la liste de candidatures actives est vide", async () => {
    render(<TotauxPaiementGlobaux candidatures={[]} edition={baseEdition()} />);

    await screen.findByText(
      textIncludes(
        `Frais d'inscription : 0 payés / ${formatFraisInscription(0)} sur ${formatFraisInscription(0)} attendus`,
      ),
    );
  });
});
