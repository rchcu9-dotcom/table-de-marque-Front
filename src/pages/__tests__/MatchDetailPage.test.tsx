import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import MatchDetailPage from "../MatchDetailPage";
import type { Match } from "../../api/match";

const baseMatch: any = {
  id: "1",
  date: "2025-11-29T08:00:00.000Z",
  teamA: "Rennes",
  teamB: "Meudon",
  status: "finished",
  scoreA: 2 as number | null,
  scoreB: 1 as number | null,
  pouleCode: "A",
  pouleName: "Poule A",
};

let mockMatch: any = { ...baseMatch };

const baseAllMatches: Match[] = [
  {
    id: "1",
    date: "2025-11-29T08:00:00.000Z",
    teamA: "Rennes",
    teamB: "Meudon",
    status: "finished",
    scoreA: 2 as number | null,
    scoreB: 1 as number | null,
    pouleCode: "A",
    pouleName: "Poule A",
  },
  {
    id: "2",
    date: "2025-11-29T09:00:00.000Z",
    teamA: "Paris",
    teamB: "Lyon",
    status: "planned",
    scoreA: null,
    scoreB: null,
    pouleCode: "A",
    pouleName: "Poule A",
  },
];

let mockAllMatches = baseAllMatches.map((m) => ({ ...m }));

vi.mock("../../hooks/useMatches", () => ({
  useMatch: () => ({
    data: mockMatch,
    isLoading: false,
    isError: false,
  }),
  useMatches: () => ({
    data: mockAllMatches,
    isLoading: false,
    isError: false,
  }),
}));

const mockClassement = {
  pouleCode: "A",
  pouleName: "Poule A",
  equipes: [
    {
      id: "Rennes",
      name: "Rennes",
      logoUrl: "https://example.com/logo.png",
      rang: 1,
      points: 10,
      victoires: 3,
      nuls: 1,
      defaites: 0,
      diff: 5,
      pouleCode: "A",
      pouleName: "Poule A",
    },
  ],
};

const mockJ3Squares = {
  jour: "J3",
  computedAt: "2026-05-25T10:00:00.000Z",
  carres: [
    {
      dbCode: "E",
      label: "Carré Or A",
      placeRange: "1..4",
      semiFinals: [
        {
          id: "1",
          date: "2025-11-29T08:00:00.000Z",
          status: "finished",
          teamA: { id: "rennes", name: "Rennes", logoUrl: null },
          teamB: { id: "meudon", name: "Meudon", logoUrl: null },
          scoreA: 2,
          scoreB: 1,
          winnerTeamId: "rennes",
        },
        {
          id: "3",
          date: "2025-11-29T10:00:00.000Z",
          status: "planned",
          teamA: { id: "paris", name: "Paris", logoUrl: null },
          teamB: { id: "lyon", name: "Lyon", logoUrl: null },
          scoreA: null,
          scoreB: null,
          winnerTeamId: null,
        },
      ],
      finalMatch: {
        id: "4",
        date: "2025-11-29T12:00:00.000Z",
        status: "planned",
        teamA: { id: "rennes", name: "Rennes", logoUrl: null },
        teamB: { id: "paris", name: "Paris", logoUrl: null },
        scoreA: null,
        scoreB: null,
        winnerTeamId: null,
      },
      thirdPlaceMatch: {
        id: "5",
        date: "2025-11-29T13:00:00.000Z",
        status: "planned",
        teamA: { id: "meudon", name: "Meudon", logoUrl: null },
        teamB: { id: "lyon", name: "Lyon", logoUrl: null },
        scoreA: null,
        scoreB: null,
        winnerTeamId: null,
      },
      ranking: [
        { rankInSquare: 1, place: 1, team: { id: "rennes", name: "Rennes", logoUrl: null }, placeholder: null },
        { rankInSquare: 2, place: 2, team: { id: "paris", name: "Paris", logoUrl: null }, placeholder: null },
        { rankInSquare: 3, place: 3, team: { id: "meudon", name: "Meudon", logoUrl: null }, placeholder: null },
        { rankInSquare: 4, place: 4, team: null, placeholder: "En attente du résultat" },
      ],
    },
  ],
};

vi.mock("../../hooks/useClassement", () => ({
  useClassementForMatch: () => ({
    data: mockClassement,
    isLoading: false,
    isError: false,
  }),
  useClassement: () => ({
    data: mockClassement,
    isLoading: false,
    isError: false,
  }),
  useJ3FinalSquares: () => ({
    data: mockJ3Squares,
    isLoading: false,
    isError: false,
  }),
}));

describe("MatchDetailPage", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      value: vi.fn(),
      writable: true,
    });
  });

  beforeEach(() => {
    mockMatch = { ...baseMatch };
    mockAllMatches = baseAllMatches.map((m) => ({ ...m }));
  });

  it("affiche le score et met en avant l'equipe gagnante", () => {
    mockMatch = { ...mockMatch, status: "finished", scoreA: 2, scoreB: 1 };
    render(
      <MemoryRouter initialEntries={["/matches/1"]}>
        <Routes>
          <Route path="/matches/:id" element={<MatchDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const scoreBlock = screen.getByTestId("match-score");
    expect(scoreBlock.textContent).toMatch(/Rennes\s*2\s*-\s*1\s*Meudon/i);
  });

  it("affiche le classement de la poule", () => {
    mockMatch = { ...mockMatch, status: "finished" };
    render(
      <MemoryRouter initialEntries={["/matches/1"]}>
        <Routes>
          <Route path="/matches/:id" element={<MatchDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Classement/i)).toBeInTheDocument();
    const rows = screen.getAllByText(/Rennes/i);
    expect(rows.length).toBeGreaterThan(0);
    expect(screen.getByText(/Pts/i)).toBeInTheDocument();
  });

  it("poule affichée, pulsation en cours, slider et résumés alignés au statut", () => {
    mockMatch = {
      ...mockMatch,
      status: "ongoing",
      scoreA: 0,
      scoreB: 0,
      pouleName: "Poule A",
      pouleCode: "A",
    };
    mockAllMatches = mockAllMatches.map((m) =>
      m.id === "1" ? { ...m, status: "ongoing", scoreA: 0, scoreB: 0 } : m,
    );
    render(
      <MemoryRouter initialEntries={["/matches/1"]}>
        <Routes>
          <Route path="/matches/:id" element={<MatchDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Carte principale : poule et pulsation
    const pouleTexts = screen.getAllByText(/Poule A/i);
    const mainPouleLabel = pouleTexts.find((node) =>
      (node as HTMLElement).className.includes("text-xs"),
    ) as HTMLElement | undefined;
    expect(mainPouleLabel).toBeTruthy();
    const mainCard = mainPouleLabel?.closest(".live-pulse-card");
    expect(mainCard).toBeInTheDocument();

    // Classement sans nom de poule
    expect(screen.getByText(/^Classement$/)).toBeInTheDocument();

    // Slider titre avec nom de poule
    expect(screen.getByText(/Matchs de la poule Poule A/i)).toBeInTheDocument();

    // Résumés compacts : liseret selon statut sélectionné (ongoing -> amber) + pulsation
    const summarySelected = screen
      .getByTestId("summary-grid-teamA")
      .querySelector('[data-testid="summary-card-1"]');
    expect(summarySelected?.className).toMatch(/border-amber-300/);
    expect(summarySelected?.className).toMatch(/live-pulse-card/);

    // Slider poule : liseret selon statut sélectionné (ongoing -> amber) + pulsation
    const sliderSelected = screen.getByTestId("poule-slider-card-1");
    expect(sliderSelected.className).toMatch(/border-amber-300/);
    expect(sliderSelected.className).toMatch(/live-pulse-card/);
  });
  it("utilise le contexte J3 pour le classement, le slider et les resumes 5v5", () => {
    mockMatch = {
      ...mockMatch,
      competitionType: "5v5",
      jour: "J3",
      pouleCode: "E",
      pouleName: "Carre Or A",
    };
    mockAllMatches = [
      { ...baseAllMatches[0], competitionType: "5v5", jour: "J3", pouleCode: "E", pouleName: "Carre Or A" },
      { ...baseAllMatches[1], id: "9", competitionType: "5v5", jour: "J3", pouleCode: "Z", pouleName: "Autre contexte" },
    ];

    render(
      <MemoryRouter initialEntries={["/matches/1"]}>
        <Routes>
          <Route path="/matches/:id" element={<MatchDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/Or A/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Matchs du carr/i)).toBeInTheDocument();
    expect(screen.queryByText(/Matchs de la poule/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Poule Carré Or A$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^Place$/)).toBeInTheDocument();
    expect(screen.getByTestId("poule-slider-card-3")).toBeInTheDocument();
    expect(screen.getByTestId("poule-slider-card-4")).toBeInTheDocument();
    expect(screen.getByTestId("poule-slider-card-5")).toBeInTheDocument();
    expect(screen.getByTestId("summary-card-4")).toBeInTheDocument();
  });

  it("retombe sur le carré J3 via les équipes si le match n'est pas retrouvé par id", () => {
    mockMatch = {
      ...mockMatch,
      id: "999",
      competitionType: "5v5",
      jour: "J3",
      pouleCode: "",
      pouleName: "",
    };
    mockAllMatches = [
      { ...baseAllMatches[0], id: "999", competitionType: "5v5", jour: "J3", pouleCode: "", pouleName: "" },
      { ...baseAllMatches[1], id: "9", competitionType: "5v5", jour: "J3", pouleCode: "Z", pouleName: "Autre contexte" },
    ];

    render(
      <MemoryRouter initialEntries={["/matches/999"]}>
        <Routes>
          <Route path="/matches/:id" element={<MatchDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const classementSection = screen.getByTestId("classement-section");
    expect(within(classementSection).getByText("Carré Or A")).toBeInTheDocument();
    expect(within(classementSection).queryByText(/^Poule /i)).not.toBeInTheDocument();
    expect(screen.getByText(/Matchs du carré Or A/i)).toBeInTheDocument();
    expect(screen.getByTestId("poule-slider-card-4")).toBeInTheDocument();
    expect(screen.getByTestId("poule-slider-card-5")).toBeInTheDocument();
    expect(screen.getByTestId("summary-card-5")).toBeInTheDocument();
  });
});
