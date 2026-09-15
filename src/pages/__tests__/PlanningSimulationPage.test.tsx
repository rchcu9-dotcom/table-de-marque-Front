import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import PlanningSimulationPage from "../PlanningSimulationPage";
import type { SimulationResult } from "../../api/planning";

const mockUseInscriptionSession = vi.fn();
vi.mock("../../hooks/useInscriptionSession", () => ({
  useInscriptionSession: () => mockUseInscriptionSession(),
}));

vi.mock("../../api/planning", () => ({
  simulerPlanning: vi.fn(),
  confirmerPlanning: vi.fn(),
  ajusterSimulation: vi.fn(),
  exporterSimulation: vi.fn(),
}));

import * as api from "../../api/planning";

const SIMULATION_MOCK: SimulationResult = {
  id: "sim-1",
  editionId: 1,
  generatedAt: "2026-09-05T10:00:00.000Z",
  score: { penalty: 0, slack: 10 },
  violations: [],
  equipes: [
    { ref: "real:1", nom: "Les Aigles", fictive: false, equipeId: 1 },
    { ref: "real:2", nom: "Les Loups", fictive: false, equipeId: 2 },
  ],
  matches: [
    {
      numMatch: 1,
      jour: 1,
      matchCase: 1,
      equipe1Ref: "real:1",
      equipe1Nom: "Les Aigles",
      equipe2Ref: "real:2",
      equipe2Nom: "Les Loups",
      dateHeure: "2026-05-23T09:00:00.000Z",
      dureeMin: 27,
      is3v3: false,
      poule: "A",
      phase: "BRASSAGE",
    },
  ],
  activites: [],
  mode: { parametresParDefautUtilises: [], effectifComplete: false },
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <PlanningSimulationPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("PlanningSimulationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche un spinner pendant le chargement de la session", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: null,
      token: null,
      edition: null,
      isLoading: true,
    });
    const { container } = renderPage();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("réserve l'accès à l'organisateur", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "TABLE_DE_MARQUE",
      token: "test-token",
      edition: { id: 1 },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText("Réservé à l'organisateur.")).toBeInTheDocument();
  });

  it("affiche un message d'invite tant qu'aucune simulation n'a été générée", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1 },
      isLoading: false,
    });
    renderPage();
    expect(
      screen.getByText(/Aucune simulation générée/),
    ).toBeInTheDocument();
  });

  it("affiche le fil d'ariane Accueil > Admin > Simulation de planning pour un organisateur", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1 },
      isLoading: false,
    });
    renderPage();

    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Simulation de planning")).toBeInTheDocument();
  });

  it("lance une simulation et affiche le Gantt, le score et les violations", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1 },
      isLoading: false,
    });
    (api.simulerPlanning as ReturnType<typeof vi.fn>).mockResolvedValue(SIMULATION_MOCK);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Simuler" }));

    await waitFor(() => expect(api.simulerPlanning).toHaveBeenCalledWith(1, undefined, "test-token"));
    expect(await screen.findByText("Les Aigles")).toBeInTheDocument();
    expect(screen.getByText("Aucune violation de contrainte.")).toBeInTheDocument();
  });

  it("confirme le planning et affiche le récapitulatif de confirmation", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1 },
      isLoading: false,
    });
    (api.simulerPlanning as ReturnType<typeof vi.fn>).mockResolvedValue(SIMULATION_MOCK);
    (api.confirmerPlanning as ReturnType<typeof vi.fn>).mockResolvedValue({
      nbMatchsCrees: 2,
      nbActivitesCrees: 4,
    });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Simuler" }));
    await screen.findByText("Les Aigles");

    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() =>
      expect(api.confirmerPlanning).toHaveBeenCalledWith(1, false, "test-token"),
    );
    expect(
      await screen.findByText(/Planning confirmé : 2 match\(s\), 4 activité\(s\) créée\(s\)\./),
    ).toBeInTheDocument();
  });

  it("exporte la simulation affichée et déclenche le téléchargement du fichier HTML", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1 },
      isLoading: false,
    });
    (api.simulerPlanning as ReturnType<typeof vi.fn>).mockResolvedValue(SIMULATION_MOCK);
    (api.exporterSimulation as ReturnType<typeof vi.fn>).mockResolvedValue("<html></html>");

    const createObjectURL = vi.fn().mockReturnValue("blob:test");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.fn();
    const realCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tag: string) => {
        const el = realCreateElement(tag);
        if (tag === "a") el.click = clickSpy;
        return el;
      });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Simuler" }));
    await screen.findByText("Les Aigles");

    fireEvent.click(screen.getByRole("button", { name: "Exporter" }));

    await waitFor(() =>
      expect(api.exporterSimulation).toHaveBeenCalledWith(1, "sim-1", "test-token"),
    );
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");

    createElementSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
