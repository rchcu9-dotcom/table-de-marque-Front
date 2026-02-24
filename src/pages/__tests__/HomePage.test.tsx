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
let dateNowSpy: ReturnType<typeof vi.spyOn> | null = null;
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
  dateNowSpy?.mockRestore();
  dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(new Date(simulatedNow).getTime());
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
  dateNowSpy?.mockRestore();
  dateNowSpy = null;
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

    const momentum = await screen.findByTestId("home-momentum");
    const cards = within(momentum).getAllByTestId(/home-momentum-card-/);
    expect(cards.length).toBeGreaterThanOrEqual(3);
    expect(within(momentum).getByTestId("home-momentum-card-m-last")).toBeInTheDocument();
    expect(within(momentum).getByTestId("home-momentum-card-m-live")).toBeInTheDocument();
    expect(within(momentum).getByTestId("home-momentum-card-m-next")).toBeInTheDocument();
    const focusMarker = within(screen.getByTestId("home-now-5v5")).getByTestId("home-momentum-focus");
    const focusedCard = focusMarker.closest('[data-testid^="home-momentum-card-"]') as HTMLElement;
    expect(focusedCard).toHaveAttribute("data-testid", "home-momentum-card-m-live");

    screen.getByTestId("home-momentum-card-m-live").click();
    expect(mockNavigate).toHaveBeenCalledWith("/matches/m-live");
  });


  it("n'affiche pas de titre dynamique dans le bloc momentum Accueil", async () => {
    mockMatches = [
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
    ];

    await renderHome("2026-01-17T14:30:00Z");

    const nowBlock = await screen.findByTestId("home-now");
    expect(within(nowBlock).queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("centre la valeur score/heure dans les cartes momentum", async () => {
    mockMatches = [
      {
        id: "m-planned",
        date: "2026-01-17T16:00:00Z",
        teamA: "A",
        teamB: "B",
        status: "planned",
        scoreA: null,
        scoreB: null,
        competitionType: "5v5",
      },
    ];

    await renderHome("2026-01-17T14:30:00Z");

    const center = await screen.findByTestId("home-momentum-center-m-planned");
    expect(center).toHaveClass("justify-self-center");
    expect(center).toHaveClass("text-center");
    expect(screen.getByTestId("home-momentum-card-m-planned")).toHaveClass("w-full");
    expect(screen.getByTestId("home-momentum-card-m-planned")).toHaveClass("md:flex-auto");
  });

  it("affiche l'heure pour planned et le score pour ongoing/finished dans la zone centrale", async () => {
    mockMatches = [
      {
        id: "m-planned",
        date: "2026-01-17T16:00:00Z",
        teamA: "A",
        teamB: "B",
        status: "planned",
        scoreA: null,
        scoreB: null,
        competitionType: "5v5",
      },
      {
        id: "m-ongoing",
        date: "2026-01-17T14:00:00Z",
        teamA: "C",
        teamB: "D",
        status: "ongoing",
        scoreA: 4,
        scoreB: 2,
        competitionType: "5v5",
      },
      {
        id: "m-finished",
        date: "2026-01-17T12:00:00Z",
        teamA: "E",
        teamB: "F",
        status: "finished",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
      },
    ];

    await renderHome("2026-01-17T14:30:00Z");

    expect(await screen.findByTestId("home-momentum-center-m-planned")).toHaveTextContent(/\d{2}:\d{2}/);
    expect(screen.getByTestId("home-momentum-center-m-ongoing")).toHaveTextContent("4-2");
    expect(screen.getByTestId("home-momentum-center-m-finished")).toHaveTextContent("1-0");
  });

  it("sans match ongoing, le rendu central momentum reste cohÃ©rent", async () => {
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
        id: "m-next",
        date: "2026-01-17T16:00:00Z",
        teamA: "C",
        teamB: "D",
        status: "planned",
        scoreA: null,
        scoreB: null,
        competitionType: "5v5",
      },
    ];

    await renderHome("2026-01-17T14:30:00Z");

    const nextCenter = await screen.findByTestId("home-momentum-center-m-next");
    expect(screen.getByTestId("home-momentum-center-m-next")).toHaveClass("justify-self-center");
    expect(nextCenter).toHaveTextContent(/\d{2}:\d{2}/);
    expect(screen.queryByTestId("home-momentum-card-m-live")).not.toBeInTheDocument();
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
    expect(screen.getByText(/Aujourd'hui · Rennes/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Équipe suivie : Rennes/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /Équipes/i })).toBeInTheDocument();
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

  it("affiche le fallback hero quand il n'y a pas de match en cours", async () => {
    mockMatches = [
      {
        id: "m-finished",
        date: "2026-01-17T12:00:00Z",
        teamA: "Rennes",
        teamB: "Paris",
        status: "finished",
        scoreA: 2,
        scoreB: 1,
        competitionType: "5v5",
      },
      {
        id: "m-next",
        date: "2026-01-17T16:00:00Z",
        teamA: "Lyon",
        teamB: "Angers",
        status: "planned",
        scoreA: null,
        scoreB: null,
        competitionType: "5v5",
      },
    ];

    await renderHome("2026-01-17T14:30:00Z");

    expect(await screen.findByTestId("home-hero-title")).toHaveTextContent("Ça joue !");
    expect(screen.getByTestId("home-hero-commentary")).toHaveTextContent("Prochain match en préparation");
  });

  it("conserve les accents dans le ticker", async () => {
    mockMatches = [
      {
        id: "m-prev",
        date: "2026-01-17T10:00:00Z",
        teamA: "Rennes",
        teamB: "Paris",
        status: "finished",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
      },
      {
        id: "m-focus",
        date: "2026-01-17T12:00:00Z",
        teamA: "Lyon",
        teamB: "Angers",
        status: "finished",
        scoreA: 2,
        scoreB: 2,
        competitionType: "5v5",
      },
    ];

    await renderHome("2026-01-17T14:30:00Z");

    const ticker = await screen.findByTestId("home-focus-ticker");
    expect(ticker.textContent).toContain("terminé");
  });
});
