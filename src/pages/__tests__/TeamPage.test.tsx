import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
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
    pouleCode: "B",
    pouleName: "Poule B",
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


const mockClassementJ1 = {
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

const mockClassementJ2 = {
  pouleCode: "B",
  pouleName: "Poule B",
  equipes: [
    {
      id: "team-paris",
      name: "Paris",
      rang: 1,
      points: 7,
      victoires: 2,
      nuls: 1,
      defaites: 0,
      diff: 4,
      pouleCode: "B",
      pouleName: "Poule B",
    },
  ],
};

let mockJ3FinalSquares = {
  jour: "J3",
  computedAt: "2026-01-01T00:00:00.000Z",
  carres: [
    {
      dbCode: "E",
      label: "Carré Or A",
      placeRange: "1..4",
      semiFinals: [],
      finalMatch: null,
      thirdPlaceMatch: null,
      ranking: [],
    },
    {
      dbCode: "F",
      label: "Carré Or B",
      placeRange: "5..8",
      semiFinals: [],
      finalMatch: null,
      thirdPlaceMatch: null,
      ranking: [],
    },
    {
      dbCode: "G",
      label: "Carré Argent C",
      placeRange: "9..12",
      semiFinals: [],
      finalMatch: null,
      thirdPlaceMatch: null,
      ranking: [
        { rankInSquare: 1, place: 9, team: null, placeholder: "Inconnu (en attente du résultat)" },
        { rankInSquare: 2, place: 10, team: null, placeholder: "Inconnu (en attente du résultat)" },
        { rankInSquare: 3, place: 11, team: null, placeholder: "Inconnu (en attente du résultat)" },
        {
          rankInSquare: 4,
          place: 12,
          team: { id: "team-rennes", name: "Rennes", logoUrl: null },
          placeholder: null,
        },
      ],
    },
    {
      dbCode: "H",
      label: "Carré Argent D",
      placeRange: "13..16",
      semiFinals: [],
      finalMatch: null,
      thirdPlaceMatch: null,
      ranking: [],
    },
  ],
};

vi.mock("@tanstack/react-query", async (orig) => {
  const mod = await orig();
  return {
    ...(mod as any),
    useQuery: (options: any) => {
      const key = options?.queryKey;
      if (Array.isArray(key) && key.includes("J2")) return { data: mockClassementJ2 };
      if (Array.isArray(key) && key.includes("J1")) return { data: mockClassementJ1 };
      return { data: mockClassementJ1 };
    },
  };
});

vi.mock("../../hooks/useClassement", () => ({
  useJ3FinalSquares: () => ({ data: mockJ3FinalSquares, isLoading: false, isError: false }),
}));

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
    mockJ3FinalSquares = {
      jour: "J3",
      computedAt: "2026-01-01T00:00:00.000Z",
      carres: [
        {
          dbCode: "E",
          label: "CarrÃ© Or A",
          placeRange: "1..4",
          semiFinals: [],
          finalMatch: null,
          thirdPlaceMatch: null,
          ranking: [],
        },
        {
          dbCode: "F",
          label: "CarrÃ© Or B",
          placeRange: "5..8",
          semiFinals: [],
          finalMatch: null,
          thirdPlaceMatch: null,
          ranking: [],
        },
        {
          dbCode: "G",
          label: "CarrÃ© Argent C",
          placeRange: "9..12",
          semiFinals: [],
          finalMatch: null,
          thirdPlaceMatch: null,
              ranking: [
                { rankInSquare: 1, place: 9, team: null, placeholder: "Inconnu (en attente du résultat)" },
                { rankInSquare: 2, place: 10, team: null, placeholder: "Inconnu (en attente du résultat)" },
                { rankInSquare: 3, place: 11, team: null, placeholder: "Inconnu (en attente du résultat)" },
                {
                  rankInSquare: 4,
                  place: 12,
                  team: { id: "team-rennes", name: "Rennes", logoUrl: null },
                  placeholder: null,
                },
              ],
        },
        {
          dbCode: "H",
          label: "CarrÃ© Argent D",
          placeRange: "13..16",
          semiFinals: [],
          finalMatch: null,
          thirdPlaceMatch: null,
          ranking: [],
        },
      ],
    };
    mockMeals = {
      days: [
        { key: "J1", label: "Samedi", dateTime: "2026-01-17T12:30:00" },
        { key: "J2", label: "Dimanche", dateTime: "2026-01-18T12:45:00" },
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

  it("affiche le bloc classements", () => {
    render(
      <MemoryRouter initialEntries={["/teams/Rennes"]}>
        <Routes>
          <Route path="/teams/:id" element={<TeamPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Classements/i)).toBeInTheDocument();
  });

  it("affiche les sections Classements dans l'ordre J3, J2, J1", () => {
    render(
      <MemoryRouter initialEntries={["/teams/Rennes"]}>
        <Routes>
          <Route path="/teams/:id" element={<TeamPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const j3 = screen.getByTestId("team-classement-j3");
    const j2 = screen.getByTestId("team-classement-j2");
    const j1 = screen.getByTestId("team-classement-j1");

    expect(j3).toHaveClass("order-1");
    expect(j2).toHaveClass("order-2");
    expect(j1).toHaveClass("order-3");
  });

  it("affiche des classements différents pour J1 et J2 selon la poule du jour", () => {
    render(
      <MemoryRouter initialEntries={["/teams/Rennes"]}>
        <Routes>
          <Route path="/teams/:id" element={<TeamPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const j1Card = screen.getByTestId("team-classement-j1");
    const j2Card = screen.getByTestId("team-classement-j2");

    expect(within(j1Card).getByText("Rennes")).toBeInTheDocument();
    expect(within(j2Card).getByText("Paris")).toBeInTheDocument();
    expect(within(j1Card).queryByText("Paris")).not.toBeInTheDocument();
  });

  it("affiche en J3 la place finale absolue (1..16)", () => {
    render(
      <MemoryRouter initialEntries={["/teams/Rennes"]}>
        <Routes>
          <Route path="/teams/:id" element={<TeamPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const j3Card = screen.getByTestId("team-classement-j3");
    const rankingRows = within(j3Card).getAllByRole("row").slice(1);
    expect(rankingRows.length).toBeGreaterThanOrEqual(3);
    const row = within(j3Card).getByText("Rennes").closest("tr") as HTMLElement;
    expect(within(row).getByText("12")).toBeInTheDocument();
    expect(within(j3Card).getAllByText(/En attente du r.sultat/i).length).toBeGreaterThan(0);
  });

  it("affiche les placeholders J3 non cliquables quand �quipe inconnue", () => {
    mockJ3FinalSquares = {
      ...mockJ3FinalSquares,
      carres: mockJ3FinalSquares.carres.map((c) =>
        c.dbCode === "G"
          ? {
              ...c,
              ranking: [
                { rankInSquare: 1, place: 9, team: null, placeholder: "Inconnu (en attente du r�sultat)" },
                { rankInSquare: 2, place: 10, team: null, placeholder: "Inconnu (en attente du r�sultat)" },
                { rankInSquare: 3, place: 11, team: null, placeholder: "Inconnu (en attente du r�sultat)" },
                { rankInSquare: 4, place: 12, team: null, placeholder: "Inconnu (en attente du r�sultat)" },
              ],
            }
          : c,
      ),
    };

    render(
      <MemoryRouter initialEntries={["/teams/Rennes"]}>
        <Routes>
          <Route path="/teams/:id" element={<TeamPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const j3Card = screen.getByTestId("team-classement-j3");
    expect(within(j3Card).getAllByText(/En attente du r.sultat/i).length).toBeGreaterThan(0);
    const placeholderRow = screen.getByTestId("team-j3-placeholder-9");
    expect(placeholderRow).not.toHaveAttribute("role", "button");
    expect(within(placeholderRow).getByText("-")).toBeInTheDocument();
    expect(screen.getByTestId("team-classement-j2")).toBeInTheDocument();
    expect(screen.getByTestId("team-classement-j1")).toBeInTheDocument();
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
    expect(within(repasCard).getByText("Samedi")).toBeInTheDocument();
    expect(within(repasCard).getByText("Dimanche")).toBeInTheDocument();
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
  it("affiche le logo competition dans Prochains matchs et activites sans masquer le contenu principal", () => {
    render(
      <MemoryRouter initialEntries={["/teams/Rennes"]}>
        <Routes>
          <Route path="/teams/:id" element={<TeamPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByAltText("Logo 5v5").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Paris").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rennes").length).toBeGreaterThan(0);
    expect(screen.queryByText(/^5v5$/i)).not.toBeInTheDocument();
  });

  it("affiche le logo competition dans Derniers matchs et activites avec score lisible et carte cliquable", () => {
    render(
      <MemoryRouter initialEntries={["/teams/Rennes"]}>
        <Routes>
          <Route path="/teams/:id" element={<TeamPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByAltText("Logo 5v5").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Meudon")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    const finished5v5 = screen.getByText("Meudon").closest("div.cursor-pointer") as HTMLElement;
    fireEvent.click(finished5v5);
    expect(mockNavigate).toHaveBeenCalledWith("/matches/1");
  });

  it("affiche le logo Challenge sur les cartes compactes sans collision avec le statut", () => {
    render(
      <MemoryRouter initialEntries={["/teams/Rennes"]}>
        <Routes>
          <Route path="/teams/:id" element={<TeamPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByAltText("Logo Challenge").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Termin/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/En cours/i)).toBeInTheDocument();
    expect(screen.getAllByText("Rennes").length).toBeGreaterThan(0);
    expect(screen.queryByText("Odin")).not.toBeInTheDocument();
    expect(screen.queryByText("Loki")).not.toBeInTheDocument();
  });
});
