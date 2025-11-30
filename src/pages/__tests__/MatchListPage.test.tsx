import "@testing-library/jest-dom/vitest";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import MatchListPage from "../MatchListPage";
import type { Match } from "../../api/match";

const mockNavigate = vi.fn();
let mockData: Match[] = [];

vi.mock("../../hooks/useMatches", () => ({
  useMatches: () => ({
    data: mockData,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("react-router-dom", async (orig) => {
  const mod = await orig();
  return {
    ...(mod as any),
    useNavigate: () => mockNavigate,
  };
});

describe("MatchListPage", () => {
  beforeEach(() => {
    mockData = [
      {
        id: "1",
        date: "2025-11-29T08:00:00.000Z",
        teamA: "Rennes",
        teamB: "Meudon",
        status: "finished",
        scoreA: 2 as number | null,
        scoreB: 1 as number | null,
      },
      {
        id: "2",
        date: "2025-11-29T09:00:00.000Z",
        teamA: "Paris",
        teamB: "Lyon",
        status: "ongoing",
        scoreA: 5 as number | null,
        scoreB: 3 as number | null,
      },
      {
        id: "3",
        date: "2025-11-29T10:00:00.000Z",
        teamA: "Nantes",
        teamB: "Bordeaux",
        status: "planned",
        scoreA: null,
        scoreB: null,
      },
    ];
  });

  it("affiche le score et met en avant l'equipe gagnante", () => {
    render(
      <MemoryRouter>
        <MatchListPage />
      </MemoryRouter>,
    );

    const matchLine = screen.getByTestId("match-line-1");
    expect(matchLine.textContent).toMatch(/Rennes\s*2\s*-\s*1\s*Meudon/i);
  });

  it("filtre les matchs via la recherche", () => {
    render(
      <MemoryRouter>
        <MatchListPage searchQuery="paris" />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("match-line-2")).toBeInTheDocument();
    expect(screen.queryByTestId("match-line-1")).not.toBeInTheDocument();
  });

  it("momentum sans match en cours prend les 3 premiers par date", () => {
    mockData = [
      { id: "a", date: "2025-01-01T08:00:00Z", teamA: "A", teamB: "B", status: "planned", scoreA: null, scoreB: null },
      { id: "b", date: "2025-01-01T09:00:00Z", teamA: "C", teamB: "D", status: "planned", scoreA: null, scoreB: null },
      { id: "c", date: "2025-01-01T10:00:00Z", teamA: "E", teamB: "F", status: "planned", scoreA: null, scoreB: null },
      { id: "d", date: "2025-01-01T11:00:00Z", teamA: "G", teamB: "H", status: "planned", scoreA: null, scoreB: null },
    ];

    render(
      <MemoryRouter>
        <MatchListPage />
      </MemoryRouter>,
    );

    const momentum = within(screen.getByTestId("momentum-list"));
    const ids = momentum.getAllByTestId(/match-line-/).map((el) => el.getAttribute("data-testid"));
    expect(ids).toEqual(["match-line-a", "match-line-b", "match-line-c"]);
  });

  it("momentum autour d'un match en cours affiche precedent, courant, suivant", () => {
    mockData = [
      { id: "a", date: "2025-01-01T08:00:00Z", teamA: "A", teamB: "B", status: "planned", scoreA: null, scoreB: null },
      { id: "b", date: "2025-01-01T09:00:00Z", teamA: "C", teamB: "D", status: "ongoing", scoreA: 1, scoreB: 1 },
      { id: "c", date: "2025-01-01T10:00:00Z", teamA: "E", teamB: "F", status: "planned", scoreA: null, scoreB: null },
      { id: "d", date: "2025-01-01T11:00:00Z", teamA: "G", teamB: "H", status: "planned", scoreA: null, scoreB: null },
    ];

    render(
      <MemoryRouter>
        <MatchListPage />
      </MemoryRouter>,
    );

    const momentum = within(screen.getByTestId("momentum-list"));
    const ids = momentum.getAllByTestId(/match-line-/).map((el) => el.getAttribute("data-testid"));
    expect(ids).toEqual(["match-line-a", "match-line-b", "match-line-c"]);
  });

  it("momentum avec tous les matchs joues prend les 3 derniers par date decroissante", () => {
    mockData = [
      { id: "a", date: "2025-01-01T08:00:00Z", teamA: "A", teamB: "B", status: "finished", scoreA: 1, scoreB: 0 },
      { id: "b", date: "2025-01-01T09:00:00Z", teamA: "C", teamB: "D", status: "finished", scoreA: 2, scoreB: 2 },
      { id: "c", date: "2025-01-01T10:00:00Z", teamA: "E", teamB: "F", status: "finished", scoreA: 3, scoreB: 1 },
      { id: "d", date: "2025-01-01T11:00:00Z", teamA: "G", teamB: "H", status: "finished", scoreA: 4, scoreB: 4 },
    ];

    render(
      <MemoryRouter>
        <MatchListPage />
      </MemoryRouter>,
    );

    const momentum = within(screen.getByTestId("momentum-list"));
    const ids = momentum.getAllByTestId(/match-line-/).map((el) => el.getAttribute("data-testid"));
    expect(ids).toEqual(["match-line-d", "match-line-c", "match-line-b"]);
  });
});
