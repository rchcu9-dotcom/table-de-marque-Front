import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Match } from "../../api/match";

let HomePage: typeof import("../HomePage").default;
const mockNavigate = vi.fn();
const mockFetchMatches = vi.fn();
let mockSelectedTeam: {
  selectedTeam: { id: string; name: string; logoUrl?: string } | null;
  setSelectedTeam: ReturnType<typeof vi.fn>;
  toggleMuted: ReturnType<typeof vi.fn>;
};

vi.mock("../../api/match", () => ({
  fetchMatches: (...args: unknown[]) => mockFetchMatches(...args),
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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function renderHome(simulatedNow = "2026-01-17T14:30:00Z") {
  vi.resetModules();
  vi.stubEnv("VITE_SIMULATED_NOW", simulatedNow);
  HomePage = (await import("../HomePage")).default;
  render(<HomePage />, { wrapper: createWrapper() });
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockFetchMatches.mockReset();
  mockFetchMatches.mockResolvedValue([]);
  mockSelectedTeam = {
    selectedTeam: null,
    setSelectedTeam: vi.fn(),
    toggleMuted: vi.fn(),
  };
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("HomePage load rapide", () => {
  it("rend le shell immédiatement même si l'API tarde", async () => {
    const deferred = createDeferred<Match[]>();
    mockFetchMatches.mockReturnValueOnce(deferred.promise);

    await renderHome();

    expect(screen.getByTestId("home-hero-title")).toBeInTheDocument();
    expect(screen.getByTestId("home-now")).toBeInTheDocument();
    expect(screen.getByTestId("home-teams-grid")).toBeInTheDocument();

    await act(async () => {
      deferred.resolve([]);
    });
  });

  it("affiche les placeholders pendant le loading pour l'équipe suivie", async () => {
    const deferred = createDeferred<Match[]>();
    mockFetchMatches.mockReturnValueOnce(deferred.promise);
    mockSelectedTeam = {
      selectedTeam: { id: "rennes", name: "Rennes", logoUrl: "logo-rennes" },
      setSelectedTeam: vi.fn(),
      toggleMuted: vi.fn(),
    };

    await renderHome();

    expect(screen.getByTestId("home-today-next")).toHaveTextContent(/Aucun match/i);
    expect(screen.getByTestId("home-today-last")).toHaveTextContent(/Aucun match/i);
    expect(screen.getByTestId("home-today-alt")).toHaveTextContent(/Aucun/i);

    await act(async () => {
      deferred.resolve([]);
    });
  });

  it("affiche un fallback visuel quand le flux SSE est indisponible", async () => {
    const deferred = createDeferred<Match[]>();
    mockFetchMatches.mockReturnValueOnce(deferred.promise);
    await renderHome();

    await act(async () => {
      window.dispatchEvent(new Event("match-stream:error"));
    });

    expect(screen.getByTestId("home-degraded-banner")).toBeInTheDocument();

    await act(async () => {
      deferred.resolve([]);
    });
  });
});
