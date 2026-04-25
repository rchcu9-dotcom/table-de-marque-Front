import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Match } from "../../api/match";
import type { MealsResponse } from "../../api/meals";

let TeamPage: typeof import("../TeamPage").default;
let mockMatches: Match[] = [];
let mockMeals: MealsResponse | null = null;
let mockTeams = [
  {
    id: "rennes",
    name: "Rennes",
    logoUrl: "logo-rennes",
    repasSamedi: "2026-01-17T12:30:00",
    repasDimanche: "2026-01-18T12:45:00",
    repasLundi: "2026-01-19T12:10:00",
  },
  { id: "paris", name: "Paris", logoUrl: "logo-paris" },
  { id: "lyon", name: "Lyon", logoUrl: "logo-lyon" },
  { id: "neuilly", name: "Neuilly", logoUrl: "logo-neuilly" },
  { id: "rouen", name: "Rouen", logoUrl: "logo-rouen" },
];

vi.mock("../../api/env", () => ({
  getApiBaseUrl: () => "http://localhost:3000",
}));

vi.mock("../../hooks/useMatches", () => ({
  useMatches: () => ({
    data: mockMatches,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../../hooks/useTeams", () => ({
  useTeams: () => ({
    data: mockTeams,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../../hooks/useMeals", () => ({
  useMeals: () => ({ data: mockMeals }),
}));

vi.mock("../../hooks/usePlayers", () => ({
  usePlayersByEquipe: () => ({ data: [], isLoading: false, isError: false }),
}));

vi.mock("../../hooks/useClassement", () => ({
  useJ3FinalSquares: () => ({
    data: {
      jour: "J3",
      computedAt: "2026-01-01T00:00:00.000Z",
      carres: [
        {
          dbCode: "E",
          label: "Carre Or A",
          placeRange: "1..4",
          semiFinals: [],
          finalMatch: null,
          thirdPlaceMatch: null,
          ranking: [],
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../../hooks/usePartenaires", () => ({
  usePartenaires: () => ({ data: [], isLoading: false }),
}));

vi.mock("@tanstack/react-query", async (orig) => {
  const mod = await orig();
  return {
    ...(mod as any),
    useQuery: (options: any) => {
      const key = options?.queryKey;
      if (Array.isArray(key) && key.includes("J2")) {
        return { data: { equipes: [{ id: "team-paris", name: "Paris", rang: 1, points: 7 }] } };
      }
      return { data: { equipes: [{ id: "team-rennes", name: "Rennes", rang: 1, points: 9 }] } };
    },
  };
});

function renderPageAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/teams/:id" element={<TeamPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function buildMatch(
  id: string,
  date: string,
  teamA: string,
  teamB: string,
  status: Match["status"],
  scoreA: number | null,
  scoreB: number | null,
): Match {
  return {
    id,
    date,
    teamA,
    teamB,
    status,
    scoreA,
    scoreB,
    competitionType: "5v5",
  };
}

describe("TeamPage visibility by global tournament progress", () => {
  beforeAll(async () => {
    TeamPage = (await import("../TeamPage")).default;
  });

  beforeEach(() => {
    mockMatches = [];
    mockTeams = [
      {
        id: "rennes",
        name: "Rennes",
        logoUrl: "logo-rennes",
        repasSamedi: "2026-01-17T12:30:00",
        repasDimanche: "2026-01-18T12:45:00",
        repasLundi: "2026-01-19T12:10:00",
      },
      { id: "paris", name: "Paris", logoUrl: "logo-paris" },
      { id: "lyon", name: "Lyon", logoUrl: "logo-lyon" },
      { id: "neuilly", name: "Neuilly", logoUrl: "logo-neuilly" },
      { id: "rouen", name: "Rouen", logoUrl: "logo-rouen" },
    ];
    mockMeals = {
      days: [
        { key: "J1", label: "Samedi", dateTime: "2026-01-17T12:30:00" },
        { key: "J2", label: "Dimanche", dateTime: "2026-01-18T12:45:00" },
        { key: "J3", label: "Lundi", dateTime: "2026-01-19T12:10:00" },
      ],
      mealOfDay: null,
    };
  });

  it("J1 non termine globalement: cache J2/J3 pour toutes les equipes", () => {
    mockMatches = [
      buildMatch("j1-1", "2026-01-17T09:00:00Z", "Rennes", "Paris", "ongoing", 1, 0),
      buildMatch("j1-2", "2026-01-17T10:00:00Z", "Neuilly", "Rouen", "planned", null, null),
      buildMatch("j2-1", "2026-01-18T09:00:00Z", "Rennes", "Lyon", "planned", null, null),
      buildMatch("j3-1", "2026-01-19T09:00:00Z", "Rennes", "Paris", "planned", null, null),
    ];

    const first = renderPageAt("/teams/Neuilly");
    expect(screen.getByTestId("team-classement-j1")).toBeInTheDocument();
    expect(screen.queryByTestId("team-classement-j2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("team-classement-j3")).not.toBeInTheDocument();

    first.unmount();
    renderPageAt("/teams/Rouen");
    expect(screen.getByTestId("team-classement-j1")).toBeInTheDocument();
    expect(screen.queryByTestId("team-classement-j2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("team-classement-j3")).not.toBeInTheDocument();
  });

  it("avant la fin globale de J1: le bloc repas ne fuite pas les horaires J2/J3", () => {
    mockMatches = [
      buildMatch("j1-1", "2026-01-17T09:00:00Z", "Rennes", "Paris", "ongoing", 1, 0),
      buildMatch("j1-2", "2026-01-17T10:00:00Z", "Neuilly", "Rouen", "planned", null, null),
      buildMatch("j2-1", "2026-01-18T09:00:00Z", "Rennes", "Lyon", "planned", null, null),
      buildMatch("j3-1", "2026-01-19T09:00:00Z", "Rennes", "Paris", "planned", null, null),
    ];

    renderPageAt("/teams/Rennes");

    const mealsCard = screen.getByTestId("team-meals");
    expect(within(mealsCard).getByText("Samedi")).toBeInTheDocument();
    expect(within(mealsCard).getByText("Dimanche")).toBeInTheDocument();
    expect(within(mealsCard).getByText("Lundi")).toBeInTheDocument();
    expect(within(mealsCard).getByText("12:30")).toBeInTheDocument();
    expect(within(mealsCard).queryByText("12:45")).not.toBeInTheDocument();
    expect(within(mealsCard).queryByText("12:10")).not.toBeInTheDocument();
    expect(within(mealsCard).getAllByText("Repas indisponible").length).toBeGreaterThanOrEqual(2);
  });

  it("J1 termine globalement: affiche J1 + J2 pour toutes les equipes", () => {
    mockMatches = [
      buildMatch("j1-1", "2026-01-17T09:00:00Z", "Rennes", "Paris", "finished", 2, 1),
      buildMatch("j1-2", "2026-01-17T10:00:00Z", "Neuilly", "Rouen", "finished", 1, 0),
      buildMatch("j2-1", "2026-01-18T09:00:00Z", "Rennes", "Lyon", "planned", null, null),
      buildMatch("j3-1", "2026-01-19T09:00:00Z", "Rennes", "Paris", "planned", null, null),
    ];

    renderPageAt("/teams/Rennes");
    expect(screen.getByTestId("team-classement-j1")).toBeInTheDocument();
    expect(screen.getByTestId("team-classement-j2")).toBeInTheDocument();
    expect(screen.queryByTestId("team-classement-j3")).not.toBeInTheDocument();
  });

  it("apres la fin globale de J1: le bloc repas peut afficher J2 mais pas encore J3", () => {
    mockMatches = [
      buildMatch("j1-1", "2026-01-17T09:00:00Z", "Rennes", "Paris", "finished", 2, 1),
      buildMatch("j1-2", "2026-01-17T10:00:00Z", "Neuilly", "Rouen", "finished", 1, 0),
      buildMatch("j2-1", "2026-01-18T09:00:00Z", "Rennes", "Lyon", "planned", null, null),
      buildMatch("j3-1", "2026-01-19T09:00:00Z", "Rennes", "Paris", "planned", null, null),
    ];

    renderPageAt("/teams/Rennes");

    const mealsCard = screen.getByTestId("team-meals");
    expect(within(mealsCard).getByText("12:30")).toBeInTheDocument();
    expect(within(mealsCard).getByText("12:45")).toBeInTheDocument();
    expect(within(mealsCard).queryByText("12:10")).not.toBeInTheDocument();
    expect(within(mealsCard).getByText("Repas indisponible")).toBeInTheDocument();
  });

  it("avant la fin globale de J2 et avant le demarrage de J3: le bloc repas cache encore J3", () => {
    mockMatches = [
      buildMatch("j1-1", "2026-01-17T09:00:00Z", "Rennes", "Paris", "finished", 2, 1),
      buildMatch("j1-2", "2026-01-17T10:00:00Z", "Neuilly", "Rouen", "finished", 1, 0),
      buildMatch("j2-1", "2026-01-18T09:00:00Z", "Rennes", "Lyon", "ongoing", 1, 0),
      buildMatch("j2-2", "2026-01-18T10:00:00Z", "Neuilly", "Rouen", "planned", null, null),
      buildMatch("j3-1", "2026-01-19T09:00:00Z", "Rennes", "Paris", "planned", null, null),
    ];

    renderPageAt("/teams/Rennes");

    const mealsCard = screen.getByTestId("team-meals");
    expect(within(mealsCard).getByText("12:45")).toBeInTheDocument();
    expect(within(mealsCard).queryByText("12:10")).not.toBeInTheDocument();
    expect(within(mealsCard).getByText("Repas indisponible")).toBeInTheDocument();
  });

  it("J2 termine globalement: affiche J1 + J2 + J3", () => {
    mockMatches = [
      buildMatch("j1-1", "2026-01-17T09:00:00Z", "Rennes", "Paris", "finished", 2, 1),
      buildMatch("j1-2", "2026-01-17T10:00:00Z", "Neuilly", "Rouen", "finished", 1, 0),
      buildMatch("j2-1", "2026-01-18T09:00:00Z", "Rennes", "Lyon", "finished", 1, 0),
      buildMatch("j2-2", "2026-01-18T10:00:00Z", "Neuilly", "Rouen", "finished", 3, 2),
      buildMatch("j3-1", "2026-01-19T09:00:00Z", "Rennes", "Paris", "planned", null, null),
    ];

    renderPageAt("/teams/Rennes");
    expect(screen.getByTestId("team-classement-j1")).toBeInTheDocument();
    expect(screen.getByTestId("team-classement-j2")).toBeInTheDocument();
    expect(screen.getByTestId("team-classement-j3")).toBeInTheDocument();
  });

  it("apres la fin globale de J2: le bloc repas peut afficher J3", () => {
    mockMatches = [
      buildMatch("j1-1", "2026-01-17T09:00:00Z", "Rennes", "Paris", "finished", 2, 1),
      buildMatch("j1-2", "2026-01-17T10:00:00Z", "Neuilly", "Rouen", "finished", 1, 0),
      buildMatch("j2-1", "2026-01-18T09:00:00Z", "Rennes", "Lyon", "finished", 1, 0),
      buildMatch("j2-2", "2026-01-18T10:00:00Z", "Neuilly", "Rouen", "finished", 3, 2),
      buildMatch("j3-1", "2026-01-19T09:00:00Z", "Rennes", "Paris", "planned", null, null),
    ];

    renderPageAt("/teams/Rennes");

    const mealsCard = screen.getByTestId("team-meals");
    expect(within(mealsCard).getByText("12:10")).toBeInTheDocument();
  });

  it("J3 demarre globalement: affiche J1 + J2 + J3", () => {
    mockMatches = [
      buildMatch("j1-1", "2026-01-17T09:00:00Z", "Rennes", "Paris", "finished", 2, 1),
      buildMatch("j2-1", "2026-01-18T09:00:00Z", "Rennes", "Lyon", "finished", 1, 0),
      buildMatch("j3-1", "2026-01-19T09:00:00Z", "Rennes", "Paris", "ongoing", 0, 0),
    ];

    renderPageAt("/teams/Paris");
    expect(screen.getByTestId("team-classement-j1")).toBeInTheDocument();
    expect(screen.getByTestId("team-classement-j2")).toBeInTheDocument();
    expect(screen.getByTestId("team-classement-j3")).toBeInTheDocument();
  });

  it("au demarrage global de J3: le bloc repas peut afficher J3", () => {
    mockMatches = [
      buildMatch("j1-1", "2026-01-17T09:00:00Z", "Rennes", "Paris", "finished", 2, 1),
      buildMatch("j2-1", "2026-01-18T09:00:00Z", "Rennes", "Lyon", "finished", 1, 0),
      buildMatch("j3-1", "2026-01-19T09:00:00Z", "Rennes", "Paris", "ongoing", 0, 0),
    ];

    renderPageAt("/teams/Rennes");

    const mealsCard = screen.getByTestId("team-meals");
    expect(within(mealsCard).getByText("12:10")).toBeInTheDocument();
  });

  it("ordre visuel non regresse quand visibles: J3 puis J2 puis J1", () => {
    mockMatches = [
      buildMatch("j1-1", "2026-01-17T09:00:00Z", "Rennes", "Paris", "finished", 2, 1),
      buildMatch("j2-1", "2026-01-18T09:00:00Z", "Rennes", "Lyon", "finished", 1, 0),
      buildMatch("j3-1", "2026-01-19T09:00:00Z", "Rennes", "Paris", "ongoing", 0, 0),
    ];

    renderPageAt("/teams/Rennes");
    expect(screen.getByTestId("team-classement-j3")).toHaveClass("order-1");
    expect(screen.getByTestId("team-classement-j2")).toHaveClass("order-2");
    expect(screen.getByTestId("team-classement-j1")).toHaveClass("order-3");
  });
});
