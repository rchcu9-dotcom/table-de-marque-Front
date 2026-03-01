import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Match } from "../../api/match";
import type { ChallengeJ1MomentumEntry, ChallengeVitesseJ3Response } from "../../api/challenge";

let HomePage: typeof import("../HomePage").default;
let mockMatches: Match[] = [];
let mockMeals: { mealOfDay: { dateTime: string | null; message?: string | null } | null } | null = null;
let mockChallengeJ1Momentum: ChallengeJ1MomentumEntry[] = [];
let mockChallengeVitesseJ3: ChallengeVitesseJ3Response | null = null;
const mockNavigate = vi.fn();
let dateNowSpy: ReturnType<typeof vi.spyOn> | null = null;
const RealDate = Date;
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

vi.mock("../../hooks/useChallengeJ1Momentum", () => ({
  useChallengeJ1Momentum: () => ({
    data: mockChallengeJ1Momentum,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../../hooks/useChallengeVitesseJ3", () => ({
  useChallengeVitesseJ3: () => ({
    data: mockChallengeVitesseJ3,
    isLoading: false,
    isError: false,
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
  const fixedNow = new RealDate(simulatedNow);
  globalThis.Date = class extends RealDate {
    constructor(value?: string | number | Date) {
      super(value === undefined ? fixedNow.toISOString() : value);
    }

    static now() {
      return fixedNow.getTime();
    }
  } as DateConstructor;
  dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(new Date(simulatedNow).getTime());
  HomePage = (await import("../HomePage")).default;
  render(<HomePage />, { wrapper: createWrapper() });
}

function getHeroSection() {
  return screen.getByTestId("home-hero-title").closest("section") as HTMLElement;
}

function getHeroSubtitle() {
  return within(getHeroSection()).getByText(
    (_content, element) => element?.tagName.toLowerCase() === "p" && !element.hasAttribute("data-testid"),
  );
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockMeals = { mealOfDay: null };
  mockChallengeJ1Momentum = [];
  mockChallengeVitesseJ3 = null;
  mockSelectedTeam = {
    selectedTeam: null,
    setSelectedTeam: vi.fn(),
    toggleMuted: vi.fn(),
  };
});

afterEach(() => {
  dateNowSpy?.mockRestore();
  dateNowSpy = null;
  globalThis.Date = RealDate;
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

  it("affiche le badge Live quand un match 5v5 est ongoing", async () => {
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

    expect(await screen.findByTestId("home-live-badge")).toHaveTextContent(/live/i);
  });

  it("rend le badge Live interactif et navigue vers /live au clic", async () => {
    mockMatches = [
      {
        id: "m-live",
        date: "2026-03-02T14:00:00Z",
        teamA: "C",
        teamB: "D",
        status: "ongoing",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
      },
    ];

    await renderHome("2026-03-02T14:30:00Z");

    const badge = await screen.findByRole("button", { name: /aller a la page live/i });

    expect(badge).toHaveTextContent(/live/i);

    fireEvent.click(badge);

    expect(mockNavigate).toHaveBeenCalledWith("/live");
  });

  it("masque le badge Live s'il n'y a pas de 5v5 ongoing", async () => {
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

    expect(screen.queryByTestId("home-live-badge")).not.toBeInTheDocument();
  });

  it("expose le badge Live comme bouton focusable avec un libelle accessible", async () => {
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

    const badge = await screen.findByRole("button", { name: /aller a la page live/i });

    badge.focus();
    expect(badge).toHaveFocus();
    expect(badge).toHaveAccessibleName("Aller a la page Live");
    expect(badge).toHaveTextContent(/live/i);
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

  it("affiche 'En cours' dans le sous-titre du hero pendant quand un match 5v5 est ongoing", async () => {
    mockMatches = [
      {
        id: "m-finished",
        date: "2026-01-17T12:00:00Z",
        teamA: "Lyon",
        teamB: "Paris",
        status: "finished",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
      },
      {
        id: "m-live",
        date: "2026-01-17T14:00:00Z",
        teamA: "Rennes",
        teamB: "Meudon",
        status: "ongoing",
        scoreA: 2,
        scoreB: 1,
        competitionType: "5v5",
      },
      {
        id: "m-next",
        date: "2026-01-17T16:00:00Z",
        teamA: "Nice",
        teamB: "Lille",
        status: "planned",
        scoreA: null,
        scoreB: null,
        competitionType: "5v5",
      },
    ];

    await renderHome("2026-01-17T14:30:00Z");

    expect(await screen.findByTestId("home-hero-title")).toHaveTextContent("Ça joue !");
    expect(getHeroSubtitle()).toHaveTextContent("En cours : Rennes vs Meudon");
  });

  it("affiche 'Prochain match' dans le sous-titre du hero pendant sans match 5v5 ongoing", async () => {
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
    expect(getHeroSubtitle()).toHaveTextContent("Prochain match : Lyon vs Angers");
  });

  it("avec une équipe suivie, garde le sous-titre match et affiche la ligne 'Équipe suivie'", async () => {
    mockSelectedTeam = {
      selectedTeam: { id: "rennes", name: "Rennes", logoUrl: "logo-rennes" },
      setSelectedTeam: vi.fn(),
      toggleMuted: vi.fn(),
    };
    mockMatches = [
      {
        id: "m-live",
        date: "2026-01-17T14:00:00Z",
        teamA: "Paris",
        teamB: "Lyon",
        status: "ongoing",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
      },
    ];

    await renderHome("2026-01-17T14:30:00Z");

    const heroSection = getHeroSection();
    await waitFor(() => {
      expect(getHeroSubtitle()).toHaveTextContent("En cours : Paris vs Lyon");
    });
    expect(within(heroSection).queryByText(/^Rennes$/)).not.toBeInTheDocument();
    expect(within(heroSection).getByText(/Équipe suivie : Rennes/i)).toBeInTheDocument();
  });

  it("utilise les placeholders du hero si les équipes du match sont absentes", async () => {
    mockMatches = [
      {
        id: "m-live",
        date: "2026-01-17T14:00:00Z",
        teamA: "",
        teamB: undefined as unknown as string,
        status: "ongoing",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
      },
    ];

    await renderHome("2026-01-17T14:30:00Z");

    expect(await screen.findByTestId("home-hero-title")).toHaveTextContent("Ça joue !");
    expect(getHeroSubtitle()).toHaveTextContent("En cours : Equipe A vs Equipe B");
  });

  it("préserve l'état hero avant avec le premier match planifié", async () => {
    mockMatches = [
      {
        id: "m-first",
        date: "2026-01-17T10:00:00Z",
        teamA: "Rennes",
        teamB: "Paris",
        status: "planned",
        scoreA: null,
        scoreB: null,
        competitionType: "5v5",
      },
      {
        id: "m-second",
        date: "2026-01-17T11:00:00Z",
        teamA: "Lyon",
        teamB: "Lille",
        status: "planned",
        scoreA: null,
        scoreB: null,
        competitionType: "5v5",
      },
    ];

    await renderHome("2026-01-17T09:00:00Z");

    expect(await screen.findByTestId("home-hero-title")).toHaveTextContent("Prêts à jouer !");
    expect(getHeroSubtitle()).toHaveTextContent("Rennes vs Paris");
  });

  it("préserve l'état hero après avec le dernier match terminé", async () => {
    mockMatches = [
      {
        id: "m-finished-1",
        date: "2026-01-17T10:00:00Z",
        teamA: "Rennes",
        teamB: "Paris",
        status: "finished",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
      },
      {
        id: "m-finished-2",
        date: "2026-01-17T12:00:00Z",
        teamA: "Lyon",
        teamB: "Lille",
        status: "finished",
        scoreA: 3,
        scoreB: 2,
        competitionType: "5v5",
      },
    ];

    await renderHome("2026-01-17T18:00:00Z");

    expect(await screen.findByTestId("home-hero-title")).toHaveTextContent("Clap de fin !");
    expect(getHeroSubtitle()).toHaveTextContent("Lyon vs Lille");
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
  it("J1 uses challenge momentum source, not legacy challenge matches", async () => {
    mockMatches = [
      {
        id: "m5v5-live",
        date: "2026-01-17T14:00:00Z",
        teamA: "A",
        teamB: "B",
        status: "ongoing",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
      },
      {
        id: "m-challenge-legacy",
        date: "2026-01-17T14:10:00Z",
        teamA: "Legacy Team",
        teamB: "Challenge",
        status: "ongoing",
        scoreA: null,
        scoreB: null,
        competitionType: "challenge",
      },
    ];
    mockChallengeJ1Momentum = [
      {
        teamId: "77",
        teamName: "Momentum Team",
        teamLogoUrl: null,
        slotStart: "2026-01-17T14:05:00Z",
        slotEnd: "2026-01-17T14:45:00Z",
        status: "ongoing",
        startedAt: "2026-01-17T14:05:00Z",
        finishedAt: null,
      },
    ];

    await renderHome("2026-01-17T14:30:00Z");

    const smallGlace = await screen.findByTestId("home-now-smallglace");
    expect(within(smallGlace).getByText("Momentum Team")).toBeInTheDocument();
    expect(within(smallGlace).queryByText("Legacy Team")).not.toBeInTheDocument();
  });

  it("J1 small-glace focuses ongoing, then planned, then finished", async () => {
    mockMatches = [
      {
        id: "m5v5-live",
        date: "2026-01-17T14:00:00Z",
        teamA: "A",
        teamB: "B",
        status: "ongoing",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
      },
    ];
    mockChallengeJ1Momentum = [
      {
        teamId: "11",
        teamName: "Planned Team",
        teamLogoUrl: null,
        slotStart: "2026-01-17T14:20:00Z",
        slotEnd: "2026-01-17T15:00:00Z",
        status: "planned",
        startedAt: null,
        finishedAt: null,
      },
      {
        teamId: "12",
        teamName: "Ongoing Team",
        teamLogoUrl: null,
        slotStart: "2026-01-17T14:10:00Z",
        slotEnd: "2026-01-17T14:50:00Z",
        status: "ongoing",
        startedAt: "2026-01-17T14:10:00Z",
        finishedAt: null,
      },
      {
        teamId: "13",
        teamName: "Finished Team",
        teamLogoUrl: null,
        slotStart: "2026-01-17T13:10:00Z",
        slotEnd: "2026-01-17T13:50:00Z",
        status: "finished",
        startedAt: "2026-01-17T13:10:00Z",
        finishedAt: "2026-01-17T13:50:00Z",
      },
    ];

    await renderHome("2026-01-17T14:30:00Z");

    const smallGlace = await screen.findByTestId("home-now-smallglace");
    const focusMarker = within(smallGlace).getByTestId("home-momentum-focus");
    const focusedCard = focusMarker.closest('[data-testid^="home-momentum-card-"]') as HTMLElement;
    expect(focusedCard).toHaveAttribute("data-testid", "home-momentum-card-challenge-12");
  });

  it("J2/J3 small-glace stays on 3v3 and ignores J1 momentum dataset", async () => {
    mockMatches = [
      {
        id: "m5v5-live-j2",
        date: "2026-01-17T09:00:00Z",
        teamA: "A",
        teamB: "B",
        status: "ongoing",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
      },
      {
        id: "m-3v3",
        date: "2026-01-18T10:00:00Z",
        teamA: "3v3 Team",
        teamB: "Opponent",
        status: "planned",
        scoreA: null,
        scoreB: null,
        competitionType: "3v3",
      },
    ];
    mockChallengeJ1Momentum = [
      {
        teamId: "77",
        teamName: "Momentum Team",
        teamLogoUrl: null,
        slotStart: "2026-01-17T14:05:00Z",
        slotEnd: "2026-01-17T14:45:00Z",
        status: "ongoing",
        startedAt: "2026-01-17T14:05:00Z",
        finishedAt: null,
      },
    ];

    await renderHome("2026-01-18T10:30:00Z");

    const smallGlace = await screen.findByTestId("home-now-smallglace");
    expect(within(smallGlace).getByText("3v3 Team")).toBeInTheDocument();
    expect(within(smallGlace).queryByText("Momentum Team")).not.toBeInTheDocument();
  });

  it("J3 small-glace consomme les phases backend avec leurs labels et statuts", async () => {
    mockMatches = [
      {
        id: "j1",
        date: "2026-02-28T10:00:00+01:00",
        teamA: "A",
        teamB: "B",
        status: "finished",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
        jour: "J1",
      },
      {
        id: "j2",
        date: "2026-03-01T10:00:00+01:00",
        teamA: "C",
        teamB: "D",
        status: "finished",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
        jour: "J2",
      },
      {
        id: "j3",
        date: "2026-03-02T10:00:00+01:00",
        teamA: "E",
        teamB: "F",
        status: "ongoing",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
        jour: "J3",
      },
    ];
    mockChallengeVitesseJ3 = {
      slots: {},
      winnerId: null,
      phases: {
        QF: {
          label: "Quart de finale",
          scheduledAt: "2026-03-02T09:48:00+01:00",
          status: "finished",
          visible: true,
          homeVisible: true,
        },
        DF: {
          label: "Demi-finale",
          scheduledAt: "2026-03-02T11:56:00+01:00",
          status: "ongoing",
          visible: true,
          homeVisible: true,
        },
        F: {
          label: "Finale",
          scheduledAt: "2026-03-02T14:04:00+01:00",
          status: "planned",
          visible: true,
          homeVisible: true,
        },
      },
    };

    await renderHome("2026-03-02T11:10:00+01:00");

    const smallGlace = await screen.findByTestId("home-now-smallglace");
    expect(within(smallGlace).getByText("Quart de finale")).toBeInTheDocument();
    expect(within(smallGlace).getByText("Demi-finale")).toBeInTheDocument();
    expect(within(smallGlace).getByText("Finale")).toBeInTheDocument();
    expect(screen.getByTestId("home-momentum-center-challenge-vitesse-phase-qf")).toHaveTextContent("Termin");
    expect(screen.getByTestId("home-momentum-center-challenge-vitesse-phase-df")).toHaveTextContent("En cours");
    expect(screen.getByTestId("home-momentum-center-challenge-vitesse-phase-f")).toHaveTextContent("14:04");

    const focusMarker = within(smallGlace).getByTestId("home-momentum-focus");
    const focusedCard = focusMarker.closest('[data-testid^="home-momentum-card-"]') as HTMLElement;
    expect(focusedCard).toHaveAttribute("data-testid", "home-momentum-card-challenge-vitesse-phase-df");

    screen.getByTestId("home-momentum-card-challenge-vitesse-phase-df").click();
    expect(mockNavigate).toHaveBeenCalledWith("/challenge");
  });

  it("J2 n'affiche pas les phases J3 sur Accueil meme si le payload backend les expose deja", async () => {
    mockMatches = [
      {
        id: "j1",
        date: "2026-02-28T10:00:00+01:00",
        teamA: "A",
        teamB: "B",
        status: "finished",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
        jour: "J1",
      },
      {
        id: "j2",
        date: "2026-03-01T10:00:00+01:00",
        teamA: "C",
        teamB: "D",
        status: "ongoing",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
        jour: "J2",
      },
      {
        id: "m-3v3-j2",
        date: "2026-03-01T12:00:00+01:00",
        teamA: "3v3 Team",
        teamB: "Opponent",
        status: "finished",
        scoreA: 2,
        scoreB: 1,
        competitionType: "3v3",
        jour: "J2",
      },
      {
        id: "j3",
        date: "2026-03-02T10:00:00+01:00",
        teamA: "E",
        teamB: "F",
        status: "planned",
        scoreA: null,
        scoreB: null,
        competitionType: "5v5",
        jour: "J3",
      },
    ];
    mockChallengeVitesseJ3 = {
      slots: {
        QF1: [{ id: "q1", name: "Joueur 1", teamId: "rennes", teamName: "Rennes" }],
      },
      winnerId: null,
      phases: {
        QF: {
          label: "Quart de finale",
          scheduledAt: "2026-03-02T09:48:00+01:00",
          status: "planned",
          visible: true,
          homeVisible: false,
        },
        DF: {
          label: "Demi-finale",
          scheduledAt: "2026-03-02T11:56:00+01:00",
          status: "planned",
          visible: false,
          homeVisible: false,
        },
        F: {
          label: "Finale",
          scheduledAt: "2026-03-02T14:04:00+01:00",
          status: "planned",
          visible: false,
          homeVisible: false,
        },
      },
    };

    await renderHome("2026-03-01T12:15:00+01:00");

    const smallGlace = await screen.findByTestId("home-now-smallglace");
    expect(within(smallGlace).getByText("3v3 Team")).toBeInTheDocument();
    expect(within(smallGlace).queryByText("Quart de finale")).not.toBeInTheDocument();
  });

  it("J3 affiche le status backend sans reinterpreter localement scheduledAt", async () => {
    mockMatches = [
      {
        id: "j1",
        date: "2026-02-28T10:00:00+01:00",
        teamA: "A",
        teamB: "B",
        status: "finished",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
        jour: "J1",
      },
      {
        id: "j2",
        date: "2026-03-01T10:00:00+01:00",
        teamA: "C",
        teamB: "D",
        status: "finished",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
        jour: "J2",
      },
      {
        id: "j3",
        date: "2026-03-02T10:00:00+01:00",
        teamA: "E",
        teamB: "F",
        status: "ongoing",
        scoreA: 1,
        scoreB: 0,
        competitionType: "5v5",
        jour: "J3",
      },
    ];
    mockChallengeVitesseJ3 = {
      slots: {},
      winnerId: null,
      phases: {
        QF: {
          label: "Quart de finale",
          scheduledAt: "2099-03-02T09:48:00+01:00",
          status: "ongoing",
          visible: true,
          homeVisible: true,
        },
        DF: {
          label: "Demi-finale",
          scheduledAt: "2099-03-02T11:56:00+01:00",
          status: "planned",
          visible: true,
          homeVisible: true,
        },
        F: {
          label: "Finale",
          scheduledAt: "2099-03-02T14:04:00+01:00",
          status: "planned",
          visible: true,
          homeVisible: true,
        },
      },
    };

    await renderHome("2026-03-02T11:10:00+01:00");

    expect(await screen.findByTestId("home-momentum-center-challenge-vitesse-phase-qf")).toHaveTextContent("En cours");
  });
});

