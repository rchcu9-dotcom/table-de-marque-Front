import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Match } from "../../api/match";
import type { PouleClassement } from "../../api/classement";
import PlanningCalendairePage from "../PlanningCalendairePage";

const matches: Match[] = [
  {
    id: "j1-1",
    date: "2026-05-23T09:00:00.000Z",
    teamA: "Rennes",
    teamB: "Dammarie",
    status: "planned",
    scoreA: null,
    scoreB: null,
    competitionType: "5v5",
    surface: "GG",
    jour: "J1",
  },
  {
    id: "j2-1",
    date: "2026-05-24T09:00:00.000Z",
    teamA: "Rennes",
    teamB: "Brest",
    status: "planned",
    scoreA: null,
    scoreB: null,
    competitionType: "5v5",
    surface: "GG",
    jour: "J2",
  },
  {
    id: "51",
    date: "2026-05-25T08:00:00.000Z",
    teamA: "G4",
    teamB: "H3",
    status: "planned",
    scoreA: null,
    scoreB: null,
    competitionType: "5v5",
    surface: "GG",
    jour: "J3",
  },
  {
    id: "52",
    date: "2026-05-25T08:00:00.000Z",
    teamA: "G3",
    teamB: "H4",
    status: "planned",
    scoreA: null,
    scoreB: null,
    competitionType: "5v5",
    surface: "GG",
    jour: "J3",
  },
  {
    id: "61",
    date: "2026-05-25T13:00:00.000Z",
    teamA: "Perd. G4-H3",
    teamB: "Perd. G3-H4",
    status: "planned",
    scoreA: null,
    scoreB: null,
    competitionType: "5v5",
    surface: "GG",
    jour: "J3",
  },
];

const classementsByCode: Record<string, PouleClassement> = {
  E: {
    pouleCode: "E",
    pouleName: "Or E",
    equipes: [
      {
        id: "rennes",
        name: "Rennes",
        rang: 1,
        joues: 0,
        victoires: 0,
        nuls: 0,
        defaites: 0,
        points: 0,
        bp: 0,
        bc: 0,
        diff: 0,
        repasDimanche: "2026-05-24T12:00:00",
      },
    ],
  },
  F: { pouleCode: "F", pouleName: "Or F", equipes: [] },
  G: { pouleCode: "G", pouleName: "Argent G", equipes: [] },
  H: { pouleCode: "H", pouleName: "Argent H", equipes: [] },
  I: { pouleCode: "I", pouleName: "Carré Or 1", equipes: [] },
  J: { pouleCode: "J", pouleName: "Carré Or 5", equipes: [] },
  K: { pouleCode: "K", pouleName: "Carré Argent 9", equipes: [] },
  L: {
    pouleCode: "L",
    pouleName: "Carré Argent 13",
    equipes: [
      {
        id: "slot-1",
        name: "Equipe resolue 1",
        rang: 3,
        ordre: 1,
        ordreFinal: 3,
        joues: 0,
        victoires: 0,
        nuls: 0,
        defaites: 0,
        points: 0,
        bp: 0,
        bc: 0,
        diff: 0,
        repasLundi: "2026-05-25T11:00:00",
      },
      {
        id: "slot-2",
        name: "Equipe resolue 2",
        rang: 4,
        ordre: 2,
        ordreFinal: 4,
        joues: 0,
        victoires: 0,
        nuls: 0,
        defaites: 0,
        points: 0,
        bp: 0,
        bc: 0,
        diff: 0,
        repasLundi: "2026-05-25T11:40:00",
      },
    ],
  },
};

vi.mock("../../hooks/useMatches", () => ({
  useMatchesFiltered: () => ({ data: matches, isLoading: false, isError: false }),
}));

vi.mock("../../hooks/useTeams", () => ({
  useTeams: () => ({
    data: [
      { id: "rennes", name: "Rennes", pouleCode: "A", repasSamedi: "2026-05-23T12:00:00" },
      { id: "dammarie", name: "Dammarie", pouleCode: "A", repasSamedi: "2026-05-23T12:40:00" },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../../api/classement", () => ({
  fetchClassementByPoule: vi.fn(async (code: string) => classementsByCode[code]),
}));

function renderPage() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <PlanningCalendairePage />
    </QueryClientProvider>,
  );
}

describe("PlanningCalendairePage", () => {
  it("keeps J1/J2 rows and renders stable J3 trajectory rows", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Rennes")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "J2" }));
    await waitFor(() => {
      expect(screen.getByText("Brest")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "J3" }));
    await waitFor(() => {
      expect(screen.getByText("Perd. G3-H4")).toBeInTheDocument();
      expect(screen.getByText("Vain. G3-H4")).toBeInTheDocument();
    });
  });
});
