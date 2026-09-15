import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import PenaliteList from "../PenaliteList";
import type { MatchPenaliteActive } from "../../../api/tableDeMarque";

vi.mock("../../../api/tableDeMarque", () => ({
  supprimerPenalite: vi.fn(),
}));

import * as api from "../../../api/tableDeMarque";

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const PENALITES: MatchPenaliteActive[] = [
  {
    id: 1,
    numMatch: 1,
    equipeId: 20,
    joueurId: 201,
    typePenaliteCode: "mineure",
    dureeMinutes: 2,
    tempsJeuDebut: 60,
    createdAt: "2026-09-04T10:00:00.000Z",
    active: true,
  },
];

function renderList(overrides: Partial<Parameters<typeof PenaliteList>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <PenaliteList
      numMatch={1}
      penalites={PENALITES}
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

describe("PenaliteList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche un message quand aucune pénalité n'est enregistrée", () => {
    renderList({ penalites: [] });
    expect(screen.getByText("Aucune pénalité enregistrée")).toBeInTheDocument();
  });

  it("affiche le nom d'équipe et le badge Active pour une pénalité en cours", () => {
    renderList();
    expect(screen.getByText("Paris")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("n'affiche pas le badge Active pour une pénalité expirée", () => {
    renderList({ penalites: [{ ...PENALITES[0], active: false }] });
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("masque le bouton de suppression quand canDelete est false", () => {
    renderList({ canDelete: false });
    expect(screen.queryByTitle("Supprimer cette pénalité")).not.toBeInTheDocument();
  });

  it("appelle supprimerPenalite avec l'id et le token au clic sur supprimer", async () => {
    renderList();
    fireEvent.click(screen.getByTitle("Supprimer cette pénalité"));
    await waitFor(() =>
      expect(api.supprimerPenalite).toHaveBeenCalledWith(1, 1, "test-token"),
    );
  });
});
