import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import AnnonceEffectifs from "../AnnonceEffectifs";
import type { EquipeEffectifs } from "../../../api/tableDeMarque";

const EQUIPE_AVEC_DOSSIER: EquipeEffectifs = {
  equipeId: 10,
  nom: "Rennes",
  joueurs: [{ id: 1, nom: "Dupont", prenom: "Léo", numero: 9, poste: "Attaquant" }],
  coachs: [{ id: 1, nom: "Petit", prenom: "Marc" }],
};

const EQUIPE_SANS_DOSSIER: EquipeEffectifs = {
  equipeId: 20,
  nom: "Paris",
  joueurs: [],
  coachs: [],
};

describe("AnnonceEffectifs", () => {
  it("affiche les joueurs et coachs des deux équipes", () => {
    render(<AnnonceEffectifs equipe1={EQUIPE_AVEC_DOSSIER} equipe2={EQUIPE_AVEC_DOSSIER} />);

    expect(screen.getAllByText(/Dupont/).length).toBe(2);
    expect(screen.getAllByText(/Petit/).length).toBe(2);
  });

  it("affiche une liste vide sans erreur quand une équipe n'a pas de dossier (critère d'acceptation)", () => {
    render(<AnnonceEffectifs equipe1={EQUIPE_SANS_DOSSIER} equipe2={EQUIPE_AVEC_DOSSIER} />);

    expect(screen.getByText("Aucun joueur enregistré")).toBeInTheDocument();
    expect(screen.getByText("Paris")).toBeInTheDocument();
    expect(screen.getByText(/Dupont/)).toBeInTheDocument();
  });

  it("n'affiche pas la liste vide quand les deux équipes ont un dossier", () => {
    render(<AnnonceEffectifs equipe1={EQUIPE_AVEC_DOSSIER} equipe2={EQUIPE_AVEC_DOSSIER} />);
    expect(screen.queryByText("Aucun joueur enregistré")).not.toBeInTheDocument();
  });
});
