import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Tournament5v5Page from "../Tournament5v5Page";
import type { Match } from "../../api/match";
import type { J3FinalSquaresResponse, PouleClassement } from "../../api/classement";

const scrollIntoViewMock = vi.fn();

const matches: Match[] = [
  {
    id: "m5",
    date: "2026-05-23T09:00:00.000Z",
    teamA: "Rennes",
    teamB: "Dammarie",
    status: "ongoing",
    scoreA: 4,
    scoreB: 3,
    competitionType: "5v5",
    surface: "GG",
    pouleCode: "Alpha",
    pouleName: "Tournoi Or - Alpha",
  },
];

const classement: PouleClassement = {
  pouleCode: "Alpha",
  pouleName: "Tournoi Or - Alpha",
  phase: "brassage",
  equipes: [
    { id: "rennes", name: "Rennes", logoUrl: "logo", rang: 1, joues: 1, victoires: 1, nuls: 0, defaites: 0, points: 3, bp: 4, bc: 3, diff: 1 },
    { id: "dammarie", name: "Dammarie", logoUrl: "logo", rang: 2, joues: 1, victoires: 0, nuls: 0, defaites: 1, points: 0, bp: 3, bc: 4, diff: -1 },
  ],
};

const j3Carres: J3FinalSquaresResponse = {
  jour: "J3",
  computedAt: "2026-05-25T10:00:00.000Z",
  carres: [
    {
      dbCode: "E",
      label: "Carré Or A",
      placeRange: "1..4",
      semiFinals: [
        {
          id: "j3-live",
          date: "2026-05-25T09:00:00.000Z",
          status: "ongoing",
          teamA: { id: "rennes", name: "Rennes", logoUrl: null },
          teamB: { id: "dammarie", name: "Dammarie", logoUrl: null },
          scoreA: 1,
          scoreB: 0,
          winnerTeamId: null,
        },
      ],
      finalMatch: null,
      thirdPlaceMatch: null,
      ranking: [
        { rankInSquare: 1, place: 1, team: null, placeholder: "Inconnu (en attente du résultat)" },
        { rankInSquare: 2, place: 2, team: null, placeholder: "Inconnu (en attente du résultat)" },
        { rankInSquare: 3, place: 3, team: null, placeholder: "Inconnu (en attente du résultat)" },
        { rankInSquare: 4, place: 4, team: null, placeholder: "Inconnu (en attente du résultat)" },
      ],
    },
    { dbCode: "F", label: "Carré Or B", placeRange: "5..8", semiFinals: [], finalMatch: null, thirdPlaceMatch: null, ranking: [] },
    { dbCode: "G", label: "Carré Argent C", placeRange: "9..12", semiFinals: [], finalMatch: null, thirdPlaceMatch: null, ranking: [] },
    { dbCode: "H", label: "Carré Argent D", placeRange: "13..16", semiFinals: [], finalMatch: null, thirdPlaceMatch: null, ranking: [] },
  ],
};

beforeAll(() => {
  (HTMLElement.prototype as any).scrollTo = vi.fn();
  (Element.prototype as any).scrollIntoView = scrollIntoViewMock;
});

vi.mock("../../hooks/useMatches", () => ({
  useMatchesFiltered: () => ({ data: matches, isLoading: false, isError: false }),
  useMomentumMatches: () => ({ data: matches, isLoading: false, isError: false }),
}));

vi.mock("../../hooks/useClassement", () => ({
  useClassement: () => ({ data: classement, isLoading: false, isError: false }),
  useJ3FinalSquares: () => ({ data: j3Carres, isLoading: false, isError: false }),
}));

vi.mock("../../providers/SelectedTeamProvider", () => ({
  useSelectedTeam: () => ({ selectedTeam: null }),
}));

describe("Tournament5v5Page", () => {
  it("affiche le header 5v5 et les matchs/classements", async () => {
    render(
      <MemoryRouter>
        <Tournament5v5Page />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Tournoi 5v5/i)).toBeInTheDocument();
    expect(screen.getByTestId("tournament-momentum")).toBeInTheDocument();
    expect(screen.getByTestId("tournament-momentum-card-m5")).toBeInTheDocument();
    expect(screen.getByTestId("tournament-momentum-focus")).toBeInTheDocument();
    expect(screen.getAllByText("Rennes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dammarie").length).toBeGreaterThan(0);
    expect(screen.getByText(/Classements Sam/i)).toBeInTheDocument();
    expect(screen.getByText("Carré Or A")).toBeInTheDocument();
    expect(screen.getAllByText("Inconnu (en attente du résultat)").length).toBeGreaterThan(0);
    const rankingBlock = screen.getByTestId("j3-square-ranking-E");
    const matchesBlock = screen.getByTestId("j3-square-matches-E");
    expect(rankingBlock.compareDocumentPosition(matchesBlock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("j3-match-j3-live")).toHaveClass("live-pulse-card");
    await waitFor(() => {
      expect(scrollIntoViewMock.mock.calls.some((args) => args[0]?.block === "start")).toBe(true);
    });
  });
});
