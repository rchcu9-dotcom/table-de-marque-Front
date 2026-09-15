import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import GroupeCard from "../GroupeCard";
import type { FormatGroupe } from "../../../api/formatGraphe";

function noop() {
  /* no-op */
}

const BASE_HANDLERS = {
  onModifierNom: noop,
  onModifierFormule: noop,
  onSupprimerGroupe: noop,
  onAjouterPlace: noop,
  onSupprimerPlace: noop,
  onDefinirLien: noop,
  onEliminer: noop,
  onReinitialiserLien: noop,
  isLoading: false,
};

function makeGroupe(overrides: Partial<FormatGroupe> = {}): FormatGroupe {
  return {
    id: 10,
    phaseId: 1,
    nom: "Poule A",
    ordre: 1,
    formule: "CHAMPIONNAT",
    places: [],
    liens: [],
    ...overrides,
  };
}

describe("GroupeCard — formule (Championnat / Ronde suisse)", () => {
  it("n'affiche aucun sélecteur pour un groupe à 2 places — libellé MATCH UNIQUE figé (CA3)", () => {
    const groupe = makeGroupe({
      formule: "RONDE_SUISSE",
      places: [
        { id: 100, groupeId: 10, position: 1, origine: "ALIAS", aliasLabel: "Équipe A", lienEntrantId: null },
        { id: 101, groupeId: 10, position: 2, origine: "ALIAS", aliasLabel: "Équipe B", lienEntrantId: null },
      ],
    });

    render(<GroupeCard groupe={groupe} groupesAutresPhases={[]} {...BASE_HANDLERS} />);

    expect(screen.getByText("MATCH UNIQUE")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("affiche un sélecteur Championnat/Ronde suisse pour un groupe de ≥3 places, positionné sur la formule courante", () => {
    const groupe = makeGroupe({
      formule: "RONDE_SUISSE",
      places: [
        { id: 100, groupeId: 10, position: 1, origine: "ALIAS", aliasLabel: "Équipe A", lienEntrantId: null },
        { id: 101, groupeId: 10, position: 2, origine: "ALIAS", aliasLabel: "Équipe B", lienEntrantId: null },
        { id: 102, groupeId: 10, position: 3, origine: "ALIAS", aliasLabel: "Équipe C", lienEntrantId: null },
      ],
    });

    render(<GroupeCard groupe={groupe} groupesAutresPhases={[]} {...BASE_HANDLERS} />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("RONDE_SUISSE");
    expect(screen.queryByText("MATCH UNIQUE")).not.toBeInTheDocument();
  });

  it("affiche le sélecteur positionné sur Championnat par défaut quand formule est absente (CA1, non-régression)", () => {
    const groupe = makeGroupe({
      formule: undefined,
      places: [
        { id: 100, groupeId: 10, position: 1, origine: "ALIAS", aliasLabel: "Équipe A", lienEntrantId: null },
        { id: 101, groupeId: 10, position: 2, origine: "ALIAS", aliasLabel: "Équipe B", lienEntrantId: null },
        { id: 102, groupeId: 10, position: 3, origine: "ALIAS", aliasLabel: "Équipe C", lienEntrantId: null },
      ],
    });

    render(<GroupeCard groupe={groupe} groupesAutresPhases={[]} {...BASE_HANDLERS} />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("CHAMPIONNAT");
  });

  it("appelle onModifierFormule avec le groupeId et la nouvelle formule quand l'organisateur change la sélection (CA2)", () => {
    const onModifierFormule = vi.fn();
    const groupe = makeGroupe({
      formule: "CHAMPIONNAT",
      places: [
        { id: 100, groupeId: 10, position: 1, origine: "ALIAS", aliasLabel: "Équipe A", lienEntrantId: null },
        { id: 101, groupeId: 10, position: 2, origine: "ALIAS", aliasLabel: "Équipe B", lienEntrantId: null },
        { id: 102, groupeId: 10, position: 3, origine: "ALIAS", aliasLabel: "Équipe C", lienEntrantId: null },
      ],
    });

    render(
      <GroupeCard
        groupe={groupe}
        groupesAutresPhases={[]}
        {...BASE_HANDLERS}
        onModifierFormule={onModifierFormule}
      />,
    );

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "RONDE_SUISSE" } });

    expect(onModifierFormule).toHaveBeenCalledWith(10, "RONDE_SUISSE");
  });
});
