import "@testing-library/jest-dom/vitest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Tournament5v5Page from "../Tournament5v5Page";
import type { Match } from "../../api/match";
import type {
  FinalSquare,
  FinalSquareMatch,
  FinalSquareRankingRow,
  J3FinalSquaresResponse,
  PouleClassement,
} from "../../api/classement";

type SelectedTeam = {
  id: string;
  name: string;
  logoUrl?: string;
};

type ScrollEvent = {
  block?: ScrollLogicalPosition;
  testId: string | null;
};

const scrollIntoViewMock = vi.fn();
const scrollEvents: ScrollEvent[] = [];

let selectedTeam: SelectedTeam | null = null;
let matches: Match[] = [];
let classementsByKey: Record<string, PouleClassement> = {};
let j3Carres: J3FinalSquaresResponse;

const RENNES_TEAM = { id: "rennes", name: "Rennes" };

const J3_LABELS: Record<FinalSquare["dbCode"], string> = {
  I: "Carré Or 1",
  J: "Carré Or 5",
  K: "Carré Argent 9",
  L: "Carré Argent 13",
};

const J3_PLACE_RANGES: Record<FinalSquare["dbCode"], string> = {
  I: "1..4",
  J: "5..8",
  K: "9..12",
  L: "13..16",
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function buildMatch(partial: Partial<Match> & Pick<Match, "id" | "teamA" | "teamB" | "date">): Match {
  return {
    id: partial.id,
    date: partial.date,
    teamA: partial.teamA,
    teamB: partial.teamB,
    status: partial.status ?? "planned",
    scoreA: partial.scoreA ?? null,
    scoreB: partial.scoreB ?? null,
    competitionType: partial.competitionType ?? "5v5",
    surface: partial.surface ?? "GG",
    pouleCode: partial.pouleCode,
    pouleName: partial.pouleName,
    jour: partial.jour ?? "J1",
  };
}

function buildClassement(code: string, phase: string, teams: Array<{ id: string; name: string; rang: number }>): PouleClassement {
  return {
    pouleCode: code,
    pouleName: code,
    phase,
    equipes: teams.map((team, index) => ({
      id: team.id,
      name: team.name,
      logoUrl: null,
      rang: team.rang,
      joues: 1,
      victoires: index === 0 ? 1 : 0,
      nuls: 0,
      defaites: index === 0 ? 0 : 1,
      points: index === 0 ? 3 : 0,
      bp: index === 0 ? 4 : 2,
      bc: index === 0 ? 2 : 4,
      diff: index === 0 ? 2 : -2,
    })),
  };
}

function buildClassements() {
  return {
    "Brassage:A": buildClassement("A", "Brassage", [
      { id: "rennes", name: "Rennes", rang: 1 },
      { id: "dammarie", name: "Dammarie", rang: 2 },
    ]),
    "Brassage:B": buildClassement("B", "Brassage", [
      { id: "nantes", name: "Nantes", rang: 1 },
      { id: "paris", name: "Paris", rang: 2 },
    ]),
    "Brassage:C": buildClassement("C", "Brassage", [
      { id: "angers", name: "Angers", rang: 1 },
      { id: "caen", name: "Caen", rang: 2 },
    ]),
    "Brassage:D": buildClassement("D", "Brassage", [
      { id: "rouen", name: "Rouen", rang: 1 },
      { id: "metz", name: "Metz", rang: 2 },
    ]),
    "Qualification:E": buildClassement("E", "Qualification", [
      { id: "rennes", name: "Rennes", rang: 1 },
      { id: "brest", name: "Brest", rang: 2 },
    ]),
    "Qualification:F": buildClassement("F", "Qualification", [
      { id: "lyon", name: "Lyon", rang: 1 },
      { id: "lille", name: "Lille", rang: 2 },
    ]),
    "Qualification:G": buildClassement("G", "Qualification", [
      { id: "nice", name: "Nice", rang: 1 },
      { id: "reims", name: "Reims", rang: 2 },
    ]),
    "Qualification:H": buildClassement("H", "Qualification", [
      { id: "amiens", name: "Amiens", rang: 1 },
      { id: "nancy", name: "Nancy", rang: 2 },
    ]),
  } satisfies Record<string, PouleClassement>;
}

function buildRankingRow(place: number, rankInSquare: 1 | 2 | 3 | 4, team?: { id: string; name: string }): FinalSquareRankingRow {
  return {
    rankInSquare,
    place,
    team: team ? { ...team, logoUrl: null } : null,
    placeholder: team ? null : "En attente du résultat",
  };
}

function buildSquareMatch(code: FinalSquare["dbCode"], teamA: { id: string; name: string }, teamB: { id: string; name: string }, status: FinalSquareMatch["status"]): FinalSquareMatch {
  return {
    id: `j3-${code}-semi`,
    date: "2026-05-25T09:00:00.000Z",
    status,
    teamA: { ...teamA, logoUrl: null },
    teamB: { ...teamB, logoUrl: null },
    scoreA: status === "planned" ? null : 1,
    scoreB: status === "planned" ? null : 0,
    winnerTeamId: status === "finished" ? teamA.id : null,
  };
}

function buildJ3Square(
  code: FinalSquare["dbCode"],
  options: { includesRennes?: boolean; live?: boolean } = {},
): FinalSquare {
  const startPlace = Number(J3_PLACE_RANGES[code].split("..")[0]);
  const primaryTeam = options.includesRennes
    ? { id: "rennes", name: "Rennes" }
    : { id: `${code.toLowerCase()}-a`, name: `${code} Team A` };
  const secondaryTeam = { id: `${code.toLowerCase()}-b`, name: `${code} Team B` };

  return {
    dbCode: code,
    label: J3_LABELS[code],
    placeRange: J3_PLACE_RANGES[code],
    semiFinals: [buildSquareMatch(code, primaryTeam, secondaryTeam, options.live ? "ongoing" : "planned")],
    finalMatch: null,
    thirdPlaceMatch: null,
    ranking: [
      buildRankingRow(startPlace, 1, options.includesRennes ? primaryTeam : undefined),
      buildRankingRow(startPlace + 1, 2),
      buildRankingRow(startPlace + 2, 3),
      buildRankingRow(startPlace + 3, 4),
    ],
  };
}

function buildJ3Carres(config: Partial<Record<FinalSquare["dbCode"], { includesRennes?: boolean; live?: boolean }>> = {}): J3FinalSquaresResponse {
  return {
    jour: "J3",
    computedAt: "2026-05-25T10:00:00.000Z",
    carres: (["I", "J", "K", "L"] as const).map((code) => buildJ3Square(code, config[code])),
  };
}

function filterMatchesByTeam(source: Match[], teamId?: string) {
  if (!teamId) return source;
  const targetKey = normalize(teamId);
  return source.filter((match) => normalize(match.teamA) === targetKey || normalize(match.teamB) === targetKey);
}

function getClassementKey(code: string, phase?: string) {
  return `${phase ?? ""}:${code}`;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Tournament5v5Page />
    </MemoryRouter>,
  );
}

function setGlobalVisibilityScenario(scenario: "j1-only" | "j1-j2" | "j1-j2-j3-finished" | "j1-j2-j3-started") {
  const j1StatusA: Match["status"] = scenario === "j1-only" ? "ongoing" : "finished";
  const j1StatusB: Match["status"] = scenario === "j1-only" ? "planned" : "finished";
  const j2StatusA: Match["status"] =
    scenario === "j1-j2-j3-finished"
      ? "finished"
      : scenario === "j1-j2-j3-started"
        ? "ongoing"
        : scenario === "j1-j2"
          ? "ongoing"
          : "planned";
  const j2StatusB: Match["status"] =
    scenario === "j1-j2-j3-finished"
      ? "finished"
      : scenario === "j1-j2-j3-started"
        ? "finished"
        : scenario === "j1-j2"
          ? "planned"
          : "planned";
  const j3Status: Match["status"] =
    scenario === "j1-j2-j3-finished"
      ? "finished"
      : scenario === "j1-j2-j3-started"
        ? "ongoing"
        : "planned";

  matches = [
    buildMatch({
      id: "j1-rennes",
      date: "2026-05-23T09:00:00.000Z",
      teamA: "Rennes",
      teamB: "Dammarie",
      status: j1StatusA,
      scoreA: scenario === "j1-only" ? null : 4,
      scoreB: scenario === "j1-only" ? null : 3,
      pouleCode: "A",
      pouleName: "Poule A",
      jour: "J1",
    }),
    buildMatch({
      id: "j1-b",
      date: "2026-05-23T10:00:00.000Z",
      teamA: "Nantes",
      teamB: "Paris",
      status: j1StatusB,
      scoreA: j1StatusB === "finished" ? 2 : null,
      scoreB: j1StatusB === "finished" ? 1 : null,
      pouleCode: "B",
      pouleName: "Poule B",
      jour: "J1",
    }),
    buildMatch({
      id: "j2-rennes",
      date: "2026-05-24T09:00:00.000Z",
      teamA: "Rennes",
      teamB: "Brest",
      status: j2StatusA,
      scoreA: j2StatusA === "planned" ? null : 1,
      scoreB: j2StatusA === "planned" ? null : 0,
      pouleCode: "E",
      pouleName: "Or E",
      jour: "J2",
    }),
    buildMatch({
      id: "j2-f",
      date: "2026-05-24T10:00:00.000Z",
      teamA: "Lyon",
      teamB: "Lille",
      status: j2StatusB,
      scoreA: j2StatusB === "finished" ? 3 : null,
      scoreB: j2StatusB === "finished" ? 2 : null,
      pouleCode: "F",
      pouleName: "Or F",
      jour: "J2",
    }),
    buildMatch({
      id: "j3-live",
      date: "2026-05-25T09:00:00.000Z",
      teamA: "Rennes",
      teamB: "Dammarie",
      status: j3Status,
      scoreA: j3Status === "planned" ? null : 1,
      scoreB: j3Status === "planned" ? null : 0,
      pouleCode: "I",
      pouleName: "Carré Or 1",
      jour: "J3",
    }),
  ];
}

function getJ3ScrollTargets() {
  return scrollEvents
    .filter((event) => event.testId?.startsWith("j3-square-"))
    .map((event) => event.testId as string);
}

function resetFixtures() {
  selectedTeam = null;
  matches = [
    buildMatch({
      id: "j1-rennes",
      date: "2026-05-23T09:00:00.000Z",
      teamA: "Rennes",
      teamB: "Dammarie",
      status: "ongoing",
      scoreA: 4,
      scoreB: 3,
      pouleCode: "A",
      pouleName: "Poule A",
      jour: "J1",
    }),
    buildMatch({
      id: "j1-b",
      date: "2026-05-23T10:00:00.000Z",
      teamA: "Nantes",
      teamB: "Paris",
      pouleCode: "B",
      pouleName: "Poule B",
      jour: "J1",
    }),
    buildMatch({
      id: "j2-rennes",
      date: "2026-05-24T09:00:00.000Z",
      teamA: "Rennes",
      teamB: "Brest",
      pouleCode: "E",
      pouleName: "Or E",
      jour: "J2",
    }),
    buildMatch({
      id: "j2-f",
      date: "2026-05-24T10:00:00.000Z",
      teamA: "Lyon",
      teamB: "Lille",
      pouleCode: "F",
      pouleName: "Or F",
      jour: "J2",
    }),
  ];
  classementsByKey = buildClassements();
  j3Carres = buildJ3Carres({ I: { includesRennes: true, live: true } });
  scrollEvents.length = 0;
  scrollIntoViewMock.mockClear();
}

beforeAll(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  (HTMLElement.prototype as { scrollTo?: () => void }).scrollTo = vi.fn();
  (Element.prototype as { scrollIntoView?: (options?: ScrollIntoViewOptions) => void }).scrollIntoView = function scrollIntoView(
    options?: ScrollIntoViewOptions,
  ) {
    const current = this as HTMLElement;
    scrollEvents.push({
      block: options?.block,
      testId: current.getAttribute("data-testid"),
    });
    scrollIntoViewMock(options);
  };
});

vi.mock("../../hooks/useMatches", () => ({
  useMatchesFiltered: (filters: { teamId?: string } = {}) => ({
    data: filterMatchesByTeam(matches, filters.teamId),
    isLoading: false,
    isError: false,
  }),
  useMomentumMatches: (filters: { teamId?: string } = {}) => ({
    data: filterMatchesByTeam(matches, filters.teamId),
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../../hooks/useClassement", () => ({
  useClassement: (code: string, phase?: string) => ({
    data: classementsByKey[getClassementKey(code, phase)],
    isLoading: false,
    isError: false,
  }),
  useJ3FinalSquares: () => ({ data: j3Carres, isLoading: false, isError: false }),
}));

vi.mock("../../providers/SelectedTeamProvider", () => ({
  useSelectedTeam: () => ({ selectedTeam }),
}));

vi.mock("../../hooks/usePartenaires", () => ({
  usePartenaires: () => ({ data: [], isLoading: false }),
}));

describe("Tournament5v5Page", () => {
  beforeEach(() => {
    resetFixtures();
  });

  it("affiche J1/J2/J3 quand les matchs existent en base, même si J1 n'est pas terminé", () => {
    setGlobalVisibilityScenario("j1-only");

    renderPage();

    expect(screen.getByText(/Tournoi 5v5/i)).toBeInTheDocument();
    expect(screen.getByTestId("tournament-momentum")).toBeInTheDocument();
    expect(screen.getByText(/Classements Sam/i)).toBeInTheDocument();
    expect(screen.getByText(/Classements Dim/i)).toBeInTheDocument();
    expect(screen.getByText(/Classements Lun/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sam" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Dim" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Lun" })).toBeEnabled();
  });

  it("affiche J1, J2 et J3 dès que J1 est terminé globalement", () => {
    setGlobalVisibilityScenario("j1-j2");

    renderPage();

    expect(screen.getByText(/Classements Sam/i)).toBeInTheDocument();
    expect(screen.getByText(/Classements Dim/i)).toBeInTheDocument();
    expect(screen.getByText(/Classements Lun/i)).toBeInTheDocument();
  });

  it("affiche J1, J2 et J3 avec les nouveaux carrés I/J/K/L quand J2 est terminé", async () => {
    setGlobalVisibilityScenario("j1-j2-j3-finished");

    renderPage();

    const headers = await screen.findAllByRole("heading", { level: 2 });
    const sectionTitles = headers.map((header) => header.textContent).filter(Boolean);
    expect(sectionTitles).toEqual([
      "Tournoi 5v5",
      "Classements Lun (Finales)",
      "Classements Dim (Qualification)",
      "Classements Sam (Brassage)",
    ]);
    expect(screen.getByTestId("j3-square-I")).toBeInTheDocument();
    expect(screen.getByText("I - Carré Or 1")).toBeInTheDocument();
    expect(screen.queryByTestId("j3-square-E")).not.toBeInTheDocument();
  });

  it("n'affiche que le carré J3 contenant Rennes quand une équipe est sélectionnée", async () => {
    selectedTeam = RENNES_TEAM;
    setGlobalVisibilityScenario("j1-j2-j3-finished");
    j3Carres = buildJ3Carres({ I: { includesRennes: true }, J: {}, K: {}, L: {} });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("j3-square-I")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("j3-square-J")).not.toBeInTheDocument();
    expect(screen.queryByText("Sam Poule B")).not.toBeInTheDocument();
    expect(screen.queryByText("Dim - Or F")).not.toBeInTheDocument();
  });

  it("n'auto-scroll pas sur un carré J3 caché contenant un match ongoing", async () => {
    selectedTeam = RENNES_TEAM;
    setGlobalVisibilityScenario("j1-j2-j3-finished");
    j3Carres = buildJ3Carres({
      I: { includesRennes: true, live: false },
      J: { includesRennes: false, live: true },
      K: {},
      L: {},
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("j3-square-I")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("j3-square-J")).not.toBeInTheDocument();
    expect(getJ3ScrollTargets()).toEqual([]);
  });

  it("auto-scroll sur le carré J3 visible qui contient un match ongoing", async () => {
    selectedTeam = RENNES_TEAM;
    setGlobalVisibilityScenario("j1-j2-j3-finished");
    j3Carres = buildJ3Carres({
      I: { includesRennes: true, live: true },
      J: { includesRennes: false, live: true },
      K: {},
      L: {},
    });

    renderPage();

    await waitFor(() => {
      expect(getJ3ScrollTargets()).toContain("j3-square-I");
    });
    expect(getJ3ScrollTargets()).not.toContain("j3-square-J");
  });

  it("conserve le filtrage J1/J2 existant quand une équipe est sélectionnée", async () => {
    selectedTeam = RENNES_TEAM;
    setGlobalVisibilityScenario("j1-j2-j3-finished");
    j3Carres = buildJ3Carres({ I: { includesRennes: true }, J: {}, K: {}, L: {} });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Sam Poule A")).toBeInTheDocument();
    });
    expect(screen.getByText("Dim - Or E")).toBeInTheDocument();
    expect(screen.queryByText("Sam Poule B")).not.toBeInTheDocument();
    expect(screen.queryByText("Sam Poule C")).not.toBeInTheDocument();
    expect(screen.queryByText("Sam Poule D")).not.toBeInTheDocument();
    expect(screen.queryByText("Dim - Or F")).not.toBeInTheDocument();
    expect(screen.queryByText("Dim - Argent G")).not.toBeInTheDocument();
    expect(screen.queryByText("Dim - Argent H")).not.toBeInTheDocument();
  });
});
