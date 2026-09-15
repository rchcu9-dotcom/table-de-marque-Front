import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import PenaliteForm from "../PenaliteForm";
import type { JoueurInfo } from "../../../api/tableDeMarque";

vi.mock("../../../api/tableDeMarque", () => ({
  ajouterPenalite: vi.fn(),
}));

import * as api from "../../../api/tableDeMarque";

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const JOUEURS: JoueurInfo[] = [
  { id: 201, nom: "Bernard", prenom: "Théo", numero: 7, poste: "Attaquant" },
];

function renderForm(joueurs: JoueurInfo[] = JOUEURS) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <PenaliteForm
      numMatch={1}
      equipeId={20}
      equipeNom="Paris"
      joueurs={joueurs}
      tempsActuel={90}
      token="test-token"
    />,
    { wrapper: makeWrapper(qc) },
  );
}

describe("PenaliteForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche un message et aucun formulaire si l'équipe n'a aucun joueur", () => {
    renderForm([]);
    expect(screen.getByText(/Aucun joueur enregistré pour Paris/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Pénalité" })).not.toBeInTheDocument();
  });

  it("désactive le bouton de soumission tant qu'aucun joueur n'est sélectionné", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "+ Pénalité" })).toBeDisabled();
  });

  it("soumet une pénalité mineure par défaut (2 min) avec le temps de jeu actuel", async () => {
    renderForm();

    fireEvent.change(screen.getByDisplayValue("Joueur…"), { target: { value: "201" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Pénalité" }));

    await waitFor(() =>
      expect(api.ajouterPenalite).toHaveBeenCalledWith(
        1,
        {
          equipeId: 20,
          joueurId: 201,
          typePenaliteCode: "mineure",
          dureeMinutes: 2,
          tempsJeuDebut: 90,
        },
        "test-token",
      ),
    );
  });

  it("soumet la durée associée au type de pénalité choisi", async () => {
    renderForm();

    fireEvent.change(screen.getByDisplayValue("Joueur…"), { target: { value: "201" } });
    fireEvent.change(screen.getByDisplayValue(/Mineure/), { target: { value: "majeure" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Pénalité" }));

    await waitFor(() =>
      expect(api.ajouterPenalite).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ typePenaliteCode: "majeure", dureeMinutes: 5 }),
        "test-token",
      ),
    );
  });

  it("réinitialise la sélection du joueur après soumission", () => {
    renderForm();

    const joueurSelect = screen.getByDisplayValue("Joueur…") as HTMLSelectElement;
    fireEvent.change(joueurSelect, { target: { value: "201" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Pénalité" }));

    expect(joueurSelect.value).toBe("");
  });
});
