import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Tournament5v5Page from "../Tournament5v5Page";
import type { Match } from "../../api/match";
import type { PouleClassement } from "../../api/classement";

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

beforeAll(() => {
  (HTMLElement.prototype as any).scrollTo = vi.fn();
  (Element.prototype as any).scrollIntoView = vi.fn();
});

vi.mock("../../hooks/useMatches", () => ({
  useMatchesFiltered: () => ({ data: matches, isLoading: false, isError: false }),
  useMomentumMatches: () => ({ data: matches, isLoading: false, isError: false }),
}));

vi.mock("../../hooks/useClassement", () => ({
  useClassement: () => ({ data: classement, isLoading: false, isError: false }),
}));

vi.mock("../../providers/SelectedTeamProvider", () => ({
  useSelectedTeam: () => ({ selectedTeam: null }),
}));

describe("Tournament5v5Page", () => {
  it("affiche le header 5v5 et les matchs/classements", () => {
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
  });
});
