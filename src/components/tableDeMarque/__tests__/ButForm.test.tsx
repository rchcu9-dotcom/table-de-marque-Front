import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import ButForm from "../ButForm";
import type { JoueurInfo } from "../../../api/tableDeMarque";

vi.mock("../../../api/tableDeMarque", () => ({
  ajouterBut: vi.fn(),
}));

import * as api from "../../../api/tableDeMarque";

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const JOUEURS: JoueurInfo[] = [
  { id: 101, nom: "Dupont", prenom: "Léo", numero: 9, poste: "Attaquant" },
  { id: 102, nom: "Martin", prenom: "Zoé", numero: 4, poste: "Défenseur" },
];

function renderForm(joueurs: JoueurInfo[] = JOUEURS) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <ButForm
      numMatch={1}
      equipeId={10}
      equipeNom="Rennes"
      joueurs={joueurs}
      tempsActuel={120}
      token="test-token"
    />,
    { wrapper: makeWrapper(qc) },
  );
}

describe("ButForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche un message et aucun formulaire si l'équipe n'a aucun joueur", () => {
    renderForm([]);
    expect(screen.getByText(/Aucun joueur enregistré pour Rennes/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ But" })).not.toBeInTheDocument();
  });

  it("désactive le bouton de soumission tant qu'aucun buteur n'est sélectionné", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "+ But" })).toBeDisabled();
  });

  it("soumet un but avec le buteur sélectionné et le temps de jeu actuel", async () => {
    renderForm();

    fireEvent.change(screen.getByDisplayValue("Buteur…"), { target: { value: "101" } });
    fireEvent.click(screen.getByRole("button", { name: "+ But" }));

    await waitFor(() =>
      expect(api.ajouterBut).toHaveBeenCalledWith(
        1,
        {
          equipeId: 10,
          buteurId: 101,
          assist1Id: null,
          assist2Id: null,
          tempsJeuSecondes: 120,
        },
        "test-token",
      ),
    );
  });

  it("inclut les assistants sélectionnés dans le payload", async () => {
    renderForm();

    fireEvent.change(screen.getByDisplayValue("Buteur…"), { target: { value: "101" } });
    fireEvent.change(screen.getByDisplayValue("Assist 1 (optionnel)"), {
      target: { value: "102" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ But" }));

    await waitFor(() =>
      expect(api.ajouterBut).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ assist1Id: 102, assist2Id: null }),
        "test-token",
      ),
    );
  });

  it("réinitialise le formulaire après soumission", () => {
    renderForm();

    const buteurSelect = screen.getByDisplayValue("Buteur…") as HTMLSelectElement;
    fireEvent.change(buteurSelect, { target: { value: "101" } });
    fireEvent.click(screen.getByRole("button", { name: "+ But" }));

    expect(buteurSelect.value).toBe("");
  });

  it("ne soumet rien si le formulaire est validé sans buteur (submit natif bloqué par required)", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "+ But" }));
    expect(api.ajouterBut).not.toHaveBeenCalled();
  });
});
