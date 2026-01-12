import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Match } from "../../api/match";

let HomePage: typeof import("../HomePage").default;
let mockMatches: Match[] = [];
let mockMeals: { mealOfDay: { dateTime: string | null; message?: string | null } | null } | null = null;
const mockNavigate = vi.fn();
let mockSelectedTeam: {
  selectedTeam: { id: string; name: string; logoUrl?: string } | null;
  setSelectedTeam: ReturnType<typeof vi.fn>;
  toggleMuted: ReturnType<typeof vi.fn>;
};

vi.mock("../../api/match", () => ({
  fetchMatches: vi.fn(() => Promise.resolve(mockMatches)),
}));

vi.mock("../../hooks/useTeams", () => ({
  useTeams: () => ({
    data: [
      { id: "rennes", name: "Rennes", logoUrl: "logo-rennes" },
      { id: "paris", name: "Paris", logoUrl: "logo-paris" },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../../hooks/useMeals", () => ({
  useMeals: () => ({
    data: mockMeals,
  }),
}));


vi.mock("../../providers/SelectedTeamProvider", () => ({
  useSelectedTeam: () => mockSelectedTeam,
}));

vi.mock("react-router-dom", async (orig) => {
  const mod = await orig();
  return {
    ...(mod as any),
    useNavigate: () => mockNavigate,
  };
});

function createWrapper() {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

async function renderHome(simulatedNow: string) {
  vi.resetModules();
  vi.stubEnv("VITE_SIMULATED_NOW", simulatedNow);
  HomePage = (await import("../HomePage")).default;
  render(<HomePage />, { wrapper: createWrapper() });
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockMeals = { mealOfDay: null };
  mockSelectedTeam = {
    selectedTeam: null,
    setSelectedTeam: vi.fn(),
    toggleMuted: vi.fn(),
  };
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("HomePage dynamique", () => {
  it("affiche la section 'En ce moment' pendant le tournoi avec live centré et cartes cliquables", async () => {
    mockMatches = [
      {
        id: "m-last",
        date: "2026-01-17T12:00:00Z",
        teamA: "A",
        teamB: "B",
        status: "finished",
        scoreA: 2,
        scoreB: 1,
        competitionType: "5v5",
      },
      {
        id: "m-live",
        date: "2026-01-17T14:00:00Z",
        teamA: "C",
        teamB: "D",
        status: "ongoing",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
      },
      {
        id: "m-next",
        date: "2026-01-17T15:00:00Z",
        teamA: "E",
        teamB: "F",
        status: "planned",
        scoreA: null,
        scoreB: null,
        competitionType: "5v5",
      },
      {
        id: "c1",
        date: "2026-01-17T13:00:00Z",
        teamA: "Glace",
        teamB: "N/A",
        status: "planned",
        scoreA: null,
        scoreB: null,
        competitionType: "challenge",
      },
    ];

    await renderHome("2026-01-17T14:30:00Z");

    const nowSection = await screen.findByTestId("home-now");
    const cards = within(nowSection).getAllByTestId(/home-now-5v5-item-/);
    expect(cards).toHaveLength(3);
    const focused = cards.find((c) => c.getAttribute("data-autofocus") === "true");
    expect(focused).toBeDefined();
    expect(focused?.className ?? "").toMatch(/live-pulse-card/);

    focused?.click();
    expect(mockNavigate).toHaveBeenCalledWith("/matches/m-live");
  });

  it("affiche Aujourd'hui pour l'équipe suivie avec prochain et dernier 5v5 + ligne Challenge/3v3", async () => {
    mockSelectedTeam = {
      selectedTeam: { id: "rennes", name: "Rennes", logoUrl: "logo-rennes" },
      setSelectedTeam: vi.fn(),
      toggleMuted: vi.fn(),
    };
    mockMatches = [
      {
        id: "p-next",
        date: "2026-01-17T16:00:00Z",
        teamA: "Rennes",
        teamB: "Paris",
        status: "planned",
        scoreA: null,
        scoreB: null,
        competitionType: "5v5",
      },
      {
        id: "p-last",
        date: "2026-01-17T11:00:00Z",
        teamA: "Rennes",
        teamB: "Lyon",
        status: "finished",
        scoreA: 3,
        scoreB: 2,
        competitionType: "5v5",
      },
      {
        id: "chal",
        date: "2026-01-17T13:00:00Z",
        teamA: "Rennes",
        teamB: "N/A",
        status: "ongoing",
        scoreA: null,
        scoreB: null,
        competitionType: "challenge",
      },
    ];

    await renderHome("2026-01-17T14:30:00Z");

    const today = await screen.findByTestId("home-today");
    expect(within(today).getByTestId("home-today-next")).toHaveTextContent(/Rennes/i);
    expect(within(today).getByTestId("home-today-last")).toHaveTextContent(/Lyon/i);
    expect(within(today).getByTestId("home-today-alt")).toHaveTextContent(/Rennes/i);
  });

  it("affiche la bannière mode dégradé quand le flux SSE signale une erreur", async () => {
    mockMatches = [];
    await renderHome("2026-01-17T14:30:00Z");

    await act(async () => {
      window.dispatchEvent(new Event("match-stream:error"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("home-degraded-banner")).toBeInTheDocument();
    });
  });

  it("affiche l'heure du repas du jour depuis /meals", async () => {
    mockSelectedTeam = {
      selectedTeam: { id: "rennes", name: "Rennes", logoUrl: "logo-rennes" },
      setSelectedTeam: vi.fn(),
      toggleMuted: vi.fn(),
    };
    mockMeals = { mealOfDay: { dateTime: "2026-01-17T12:30:00" } };

    await renderHome("2026-01-17T14:30:00Z");

    expect(screen.getByText("Repas du jour")).toBeInTheDocument();
    expect(screen.getByText(/12:30/)).toBeInTheDocument();
  });

  it("affiche le fallback repas si dateTime est null", async () => {
    mockSelectedTeam = {
      selectedTeam: { id: "rennes", name: "Rennes", logoUrl: "logo-rennes" },
      setSelectedTeam: vi.fn(),
      toggleMuted: vi.fn(),
    };
    mockMeals = { mealOfDay: { dateTime: null, message: "Repas indisponible" } };

    await renderHome("2026-01-17T14:30:00Z");

    expect(screen.getByText("Repas du jour")).toBeInTheDocument();
    expect(screen.getByText(/Repas indisponible/i)).toBeInTheDocument();
  });
});
