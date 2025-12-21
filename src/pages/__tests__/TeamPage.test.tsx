import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Match } from "../../api/match";

vi.mock("../../api/env", () => ({
  getApiBaseUrl: () => "http://localhost:3000",
}));

vi.stubGlobal("process", { env: { VITE_API_BASE_URL: "http://localhost:3000" } });

let TeamPage: typeof import("../TeamPage").default;

const mockMatches: Match[] = [
  {
    id: "1",
    date: "2025-11-29T08:00:00.000Z",
    teamA: "Rennes",
    teamB: "Meudon",
    status: "finished",
    scoreA: 3,
    scoreB: 2,
    pouleCode: "A",
    pouleName: "Poule A",
  },
  {
    id: "2",
    date: "2025-11-30T10:00:00.000Z",
    teamA: "Paris",
    teamB: "Rennes",
    status: "planned",
    scoreA: null,
    scoreB: null,
    pouleCode: "A",
    pouleName: "Poule A",
  },
  {
    id: "3",
    date: "2025-12-01T10:00:00.000Z",
    teamA: "Rennes",
    teamB: "Lyon",
    status: "ongoing",
    scoreA: 1,
    scoreB: 1,
    pouleCode: "A",
    pouleName: "Poule A",
  },
];

vi.mock("../../hooks/useMatches", () => ({
  useMatches: () => ({
    data: mockMatches,
    isLoading: false,
    isError: false,
  }),
}));

const mockClassement = {
  pouleCode: "A",
  pouleName: "Poule A",
  equipes: [
    {
      id: "team-rennes",
      name: "Rennes",
      rang: 1,
      points: 9,
      victoires: 3,
      nuls: 0,
      defaites: 0,
      diff: 5,
      pouleCode: "A",
      pouleName: "Poule A",
    },
  ],
};

vi.mock("@tanstack/react-query", async (orig) => {
  const mod = await orig();
  return {
    ...(mod as any),
    useQuery: () => ({ data: mockClassement }),
  };
});

describe("TeamPage", () => {
  beforeAll(async () => {
    TeamPage = (await import("../TeamPage")).default;
  });

  it("affiche le header et les infos clés de l'équipe", () => {
    render(
      <MemoryRouter initialEntries={["/teams/Rennes"]}>
        <Routes>
          <Route path="/teams/:id" element={<TeamPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("heading", { name: /Rennes/i })[0]).toBeInTheDocument();
    expect(screen.getByText(/Forme \(tous terminés\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Prochains matchs/i)).toBeInTheDocument();
    expect(screen.getByText(/Derniers matchs/i)).toBeInTheDocument();
  });

  it("affiche le calendrier et le classement", () => {
    render(
      <MemoryRouter initialEntries={["/teams/Rennes"]}>
        <Routes>
          <Route path="/teams/:id" element={<TeamPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const calendrierHeaders = screen.getAllByText(/Calendrier/i);
    expect(calendrierHeaders.length).toBeGreaterThan(0);
    const classements = screen.getAllByText(/Classement/i);
    expect(classements.length).toBeGreaterThan(0);
  });
});
