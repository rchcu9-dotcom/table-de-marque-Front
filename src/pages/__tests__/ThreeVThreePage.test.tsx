import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ThreeVThreePage from "../ThreeVThreePage";
import type { Match } from "../../api/match";

const matches: Match[] = [
  {
    id: "m3",
    date: "2026-05-23T11:00:00.000Z",
    teamA: "Rennes",
    teamB: "Le Havre",
    status: "ongoing",
    scoreA: 3,
    scoreB: 2,
    competitionType: "3v3",
    surface: "PG",
    pouleName: "3v3 Round 1",
  },
];

beforeAll(() => {
  (HTMLElement.prototype as any).scrollTo = vi.fn();
  (Element.prototype as any).scrollIntoView = vi.fn();
});

vi.mock("../../hooks/useMatches", () => ({
  useMatchesFiltered: () => ({ data: matches, isLoading: false, isError: false }),
}));

vi.mock("../../providers/SelectedTeamProvider", () => ({
  useSelectedTeam: () => ({ selectedTeam: null }),
}));

describe("ThreeVThreePage", () => {
  it("affiche le header 3v3 et les matchs filtrés", () => {
    render(
      <MemoryRouter>
        <ThreeVThreePage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Tournoi 3v3 FUN/i)).toBeInTheDocument();
    expect(screen.getByText("Rennes")).toBeInTheDocument();
    expect(screen.getByText("Le Havre")).toBeInTheDocument();
  });
});
