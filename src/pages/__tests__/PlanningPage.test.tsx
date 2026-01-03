import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlanningPage from "../PlanningPage";
import type { Match } from "../../api/match";

const matches: Match[] = [
  {
    id: "m1",
    date: "2026-05-23T09:00:00.000Z",
    teamA: "Rennes",
    teamB: "Dammarie",
    status: "finished",
    scoreA: 2,
    scoreB: 1,
    competitionType: "5v5",
    surface: "GG",
    pouleName: "Tournoi Or - Alpha",
  },
  {
    id: "m2",
    date: "2026-05-23T10:00:00.000Z",
    teamA: "Meudon",
    teamB: "Rouen",
    status: "planned",
    scoreA: null,
    scoreB: null,
    competitionType: "3v3",
    surface: "PG",
    pouleName: "3v3 Round 1",
  },
];

beforeAll(() => {
  (HTMLElement.prototype as any).scrollTo = vi.fn();
});

vi.mock("../../hooks/useMatches", () => ({
  useMatchesFiltered: () => ({ data: matches, isLoading: false, isError: false }),
}));

vi.mock("../../providers/SelectedTeamProvider", () => ({
  useSelectedTeam: () => ({ selectedTeam: null }),
}));

describe("PlanningPage", () => {
  it("affiche le header Planning et la liste des matchs", () => {
    render(
      <MemoryRouter>
        <PlanningPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Planning/i)).toBeInTheDocument();
    expect(screen.getByText("Rennes")).toBeInTheDocument();
    expect(screen.getByText("Dammarie")).toBeInTheDocument();
  });
});
