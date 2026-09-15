import "@testing-library/jest-dom/vitest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TournamentTimelinePage from "../TournamentTimelinePage";
import type { Match } from "../../api/match";

const matches: Match[] = [
  {
    id: "1",
    date: "2026-05-23T09:00:00.000Z",
    teamA: "Rennes",
    teamB: "Dammarie",
    status: "planned",
    scoreA: null,
    scoreB: null,
    jour: "J1",
  },
];

vi.mock("../../hooks/useMatches", () => ({
  useMatches: () => ({ data: matches, isLoading: false, isError: false }),
}));

vi.mock("../../providers/SelectedTeamProvider", () => ({
  useSelectedTeam: () => ({ selectedTeam: null }),
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <TournamentTimelinePage />
    </MemoryRouter>,
  );
}

describe("TournamentTimelinePage", () => {
  it("affiche le fil d'ariane Accueil > Planning > Timeline en direct", () => {
    renderPage();

    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.getByText("Planning")).toBeInTheDocument();
    expect(screen.getByText("Timeline en direct")).toBeInTheDocument();
  });

  it("affiche le match du jour actif", () => {
    renderPage();

    expect(screen.getByText("Rennes")).toBeInTheDocument();
    expect(screen.getByText("Dammarie")).toBeInTheDocument();
  });
});
