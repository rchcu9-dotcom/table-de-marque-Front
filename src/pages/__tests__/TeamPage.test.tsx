import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Match } from "../../api/match";
import type { MealsResponse } from "../../api/meals";

vi.mock("../../api/env", () => ({
  getApiBaseUrl: () => "http://localhost:3000",
}));

vi.stubGlobal("process", { env: { VITE_API_BASE_URL: "http://localhost:3000" } });

let TeamPage: typeof import("../TeamPage").default;
const mockNavigate = vi.fn();
let mockMeals: MealsResponse | null = null;

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
  {
    id: "4",
    date: "2025-12-01T12:00:00.000Z",
    teamA: "Rennes",
    teamB: "Odin",
    status: "finished",
    scoreA: 2,
    scoreB: 0,
    competitionType: "challenge",
  },
  {
    id: "5",
    date: "2025-12-01T13:00:00.000Z",
    teamA: "Rennes",
    teamB: "Loki",
    status: "ongoing",
    scoreA: null,
    scoreB: null,
    competitionType: "challenge",
  },
];

vi.mock("../../hooks/useMatches", () => ({
  useMatches: () => ({
    data: mockMatches,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../../hooks/useMeals", () => ({
  useMeals: () => ({
    data: mockMeals,
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

vi.mock("react-router-dom", async (orig) => {
  const mod = await orig();
  return {
    ...(mod as any),
    useNavigate: () => mockNavigate,
  };
});

describe("TeamPage", () => {
  beforeAll(async () => {
    TeamPage = (await import("../TeamPage")).default;
  });

  beforeEach(() => {
    mockNavigate.mockReset();
    mockMeals = {
      days: [
        { key: "J1", label: "J1", dateTime: "2026-01-17T12:30:00" },
        { key: "J2", label: "J2", dateTime: "2026-01-18T12:45:00" },
        { key: "J3", label: "J3", dateTime: null, message: "Repas indisponible" },
      ],
      mealOfDay: null,
    };
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
    expect(screen.getByText(/Forme/i)).toBeInTheDocument();
    expect(screen.getByText(/matchs termin/i)).toBeInTheDocument();
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

  it("affiche les repas J1/J2 et le fallback J3", () => {
    render(
      <MemoryRouter initialEntries={["/teams/Rennes"]}>
        <Routes>
          <Route path="/teams/:id" element={<TeamPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const repasTitle = screen.getByText("Repas");
    const repasCard = repasTitle.closest("div") as HTMLElement;
    expect(within(repasCard).getByText("J1")).toBeInTheDocument();
    expect(within(repasCard).getByText("J2")).toBeInTheDocument();
    expect(within(repasCard).getByText("J3")).toBeInTheDocument();
    expect(within(repasCard).getByText(/12:30/)).toBeInTheDocument();
    expect(within(repasCard).getByText(/12:45/)).toBeInTheDocument();
    expect(within(repasCard).getByText(/Repas indisponible/i)).toBeInTheDocument();
  });

  it("rend les cartes Challenge compactes dans Derniers matchs", () => {
    render(
      <MemoryRouter initialEntries={["/teams/Rennes"]}>
        <Routes>
          <Route path="/teams/:id" element={<TeamPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const lastMatchesCard = screen.getByText(/Derniers matchs/i).closest("div");
    expect(lastMatchesCard).toBeTruthy();

    const finishedStatus = within(lastMatchesCard as HTMLElement).getByText(/Terminé/i);
    const finishedCard = finishedStatus.closest("div") as HTMLElement;
    expect(within(finishedCard).getByText(/Terminé/i)).toBeInTheDocument();
    expect(within(finishedCard).queryByText("Odin")).not.toBeInTheDocument();

    const ongoingStatus = within(lastMatchesCard as HTMLElement).getByText(/En cours/i);
    const ongoingCard = ongoingStatus.closest("div") as HTMLElement;
    expect(within(ongoingCard).getByText(/En cours/i)).toBeInTheDocument();
    expect(within(ongoingCard).queryByText("Loki")).not.toBeInTheDocument();
  });
});
