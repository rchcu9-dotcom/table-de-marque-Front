import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import TableDeMarqueOperatorPage from "../TableDeMarqueOperatorPage";
import type { MatchLiveDetail, EffectifsMatch } from "../../api/tableDeMarque";

const mockUseInscriptionSession = vi.fn();
vi.mock("../../hooks/useInscriptionSession", () => ({
  useInscriptionSession: () => mockUseInscriptionSession(),
}));

vi.mock("../../hooks/useMatches", () => ({
  useMatches: () => ({
    data: [
      {
        id: "1",
        teamA: "Rennes",
        teamB: "Paris",
        competitionType: "5v5",
        status: "ongoing",
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("../../api/tableDeMarque", () => ({
  fetchMatchLive: vi.fn(),
  fetchEffectifsMatch: vi.fn(),
}));

import * as api from "../../api/tableDeMarque";

const LIVE_MOCK: MatchLiveDetail = {
  matchLive: {
    numMatch: 1,
    etat: "EN_PAUSE",
    tempsEcouleSecondes: 90,
    chronoEnCours: false,
    chronoDerniereMajAt: null,
    score1Cache: 1,
    score2Cache: 0,
    createdAt: "2026-09-04T10:00:00.000Z",
    updatedAt: "2026-09-04T10:00:00.000Z",
  },
  buts: [],
  penalites: [],
};

const EFFECTIFS_MOCK: EffectifsMatch = {
  equipe1: { equipeId: 10, nom: "Rennes", joueurs: [], coachs: [] },
  equipe2: { equipeId: 20, nom: "Paris", joueurs: [], coachs: [] },
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TableDeMarqueOperatorPage />
    </QueryClientProvider>,
  );
}

async function selectMatch() {
  const select = screen.getByRole("combobox");
  fireEvent.change(select, { target: { value: "1|Rennes vs Paris" } });
}

describe("TableDeMarqueOperatorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.fetchMatchLive as ReturnType<typeof vi.fn>).mockResolvedValue(LIVE_MOCK);
    (api.fetchEffectifsMatch as ReturnType<typeof vi.fn>).mockResolvedValue(EFFECTIFS_MOCK);
  });

  it("affiche un spinner pendant le chargement de la session", () => {
    mockUseInscriptionSession.mockReturnValue({ role: null, token: null, isLoading: true });
    const { container } = renderPage();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("un visiteur (rôle null) n'a accès qu'à une vue lecture seule, sans contrôles opérateur", async () => {
    mockUseInscriptionSession.mockReturnValue({ role: null, token: null, isLoading: false });
    renderPage();

    await selectMatch();

    expect(await screen.findByText("Vue lecture seule")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Démarrer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lancer l'annonce" })).not.toBeInTheDocument();
  });

  it("un opérateur TABLE_DE_MARQUE voit les contrôles de pilotage du match", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "TABLE_DE_MARQUE",
      token: "test-token",
      isLoading: false,
    });
    renderPage();

    await selectMatch();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Démarrer" })).toBeInTheDocument(),
    );
    expect(screen.queryByText("Vue lecture seule")).not.toBeInTheDocument();
  });

  it("un ORGANISATEUR est aussi traité comme opérateur", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      isLoading: false,
    });
    renderPage();

    await selectMatch();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Démarrer" })).toBeInTheDocument(),
    );
  });
});
