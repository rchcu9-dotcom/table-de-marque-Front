import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import ButList from "../ButList";
import type { MatchBut } from "../../../api/tableDeMarque";

vi.mock("../../../api/tableDeMarque", () => ({
  supprimerBut: vi.fn(),
}));

import * as api from "../../../api/tableDeMarque";

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const BUTS: MatchBut[] = [
  {
    id: 1,
    numMatch: 1,
    equipeId: 10,
    buteurId: 101,
    assist1Id: null,
    assist2Id: null,
    tempsJeuSecondes: 125,
    createdAt: "2026-09-04T10:00:00.000Z",
  },
];

function renderList(overrides: Partial<Parameters<typeof ButList>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <ButList
      numMatch={1}
      buts={BUTS}
      equipe1Id={10}
      equipe1Nom="Rennes"
      equipe2Id={20}
      equipe2Nom="Paris"
      canDelete={true}
      token="test-token"
      {...overrides}
    />,
    { wrapper: makeWrapper(qc) },
  );
}

describe("ButList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche un message quand aucun but n'est enregistré", () => {
    renderList({ buts: [] });
    expect(screen.getByText("Aucun but enregistré")).toBeInTheDocument();
  });

  it("affiche le nom d'équipe et le temps de jeu formaté (2'05)", () => {
    renderList();
    expect(screen.getByText("Rennes")).toBeInTheDocument();
    expect(screen.getByText("2'05")).toBeInTheDocument();
  });

  it("masque le bouton de suppression quand canDelete est false", () => {
    renderList({ canDelete: false });
    expect(screen.queryByTitle("Supprimer ce but")).not.toBeInTheDocument();
  });

  it("appelle supprimerBut avec l'id du but et le token au clic sur supprimer", async () => {
    renderList();
    fireEvent.click(screen.getByTitle("Supprimer ce but"));
    await waitFor(() => expect(api.supprimerBut).toHaveBeenCalledWith(1, 1, "test-token"));
  });
});
