import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  usePlanningSimulationState,
  useSimulerPlanning,
  useAjusterSimulation,
  useConfirmerPlanning,
  useExporterSimulation,
  planningSimulationQueryKey,
} from "../usePlanningSimulation";
import * as api from "../../api/planning";
import type { SimulationResult } from "../../api/planning";

vi.mock("../../api/planning", () => ({
  simulerPlanning: vi.fn(),
  confirmerPlanning: vi.fn(),
  ajusterSimulation: vi.fn(),
  exporterSimulation: vi.fn(),
}));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const SIMULATION_MOCK: SimulationResult = {
  id: "sim-1",
  editionId: 1,
  generatedAt: "2026-09-05T10:00:00.000Z",
  score: { penalty: 0, slack: 10 },
  violations: [],
  equipes: [],
  matches: [],
  activites: [],
  mode: { parametresParDefautUtilises: [], effectifComplete: false },
};

describe("usePlanningSimulation", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('utilise la clé de requête ["planning-simulation", editionId]', () => {
    expect(planningSimulationQueryKey(1)).toEqual(["planning-simulation", 1]);
  });

  it("usePlanningSimulationState ne déclenche aucun appel réseau (lecture du cache uniquement)", () => {
    renderHook(() => usePlanningSimulationState(1), { wrapper: makeWrapper(qc) });
    expect(qc.getQueryData(planningSimulationQueryKey(1))).toBeUndefined();
  });

  describe("useSimulerPlanning", () => {
    it("appelle simulerPlanning et stocke le résultat en cache", async () => {
      (api.simulerPlanning as ReturnType<typeof vi.fn>).mockResolvedValue(SIMULATION_MOCK);

      const { result } = renderHook(() => useSimulerPlanning(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate(8);

      await waitFor(() => expect(api.simulerPlanning).toHaveBeenCalledTimes(1));
      expect(api.simulerPlanning).toHaveBeenCalledWith(1, 8, "token-1");
      await waitFor(() => result.current.isSuccess);
      expect(qc.getQueryData(planningSimulationQueryKey(1))).toEqual(SIMULATION_MOCK);
    });
  });

  describe("useAjusterSimulation", () => {
    it("appelle ajusterSimulation avec les paramètres du match et met à jour le cache", async () => {
      const ajuste = { ...SIMULATION_MOCK, score: { penalty: 5, slack: 0 } };
      (api.ajusterSimulation as ReturnType<typeof vi.fn>).mockResolvedValue(ajuste);

      const { result } = renderHook(() => useAjusterSimulation(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate({
        simulationId: "sim-1",
        numMatch: 1,
        payload: { dureeMin: 30 },
      });

      await waitFor(() => expect(api.ajusterSimulation).toHaveBeenCalledTimes(1));
      expect(api.ajusterSimulation).toHaveBeenCalledWith(
        1,
        "sim-1",
        1,
        { dureeMin: 30 },
        "token-1",
      );
      await waitFor(() => result.current.isSuccess);
      expect(qc.getQueryData(planningSimulationQueryKey(1))).toEqual(ajuste);
    });
  });

  describe("useConfirmerPlanning", () => {
    it("appelle confirmerPlanning et vide le cache de simulation après succès", async () => {
      qc.setQueryData(planningSimulationQueryKey(1), SIMULATION_MOCK);
      (api.confirmerPlanning as ReturnType<typeof vi.fn>).mockResolvedValue({
        nbMatchsCrees: 2,
        nbActivitesCrees: 3,
      });

      const { result } = renderHook(() => useConfirmerPlanning(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate(true);

      await waitFor(() => expect(api.confirmerPlanning).toHaveBeenCalledTimes(1));
      expect(api.confirmerPlanning).toHaveBeenCalledWith(1, true, "token-1");
      await waitFor(() => result.current.isSuccess);
      expect(qc.getQueryData(planningSimulationQueryKey(1))).toBeNull();
    });
  });

  describe("useExporterSimulation", () => {
    it("appelle exporterSimulation avec l'id de simulation et retourne le HTML", async () => {
      (api.exporterSimulation as ReturnType<typeof vi.fn>).mockResolvedValue("<html></html>");

      const { result } = renderHook(() => useExporterSimulation(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate("sim-1");

      await waitFor(() => expect(api.exporterSimulation).toHaveBeenCalledTimes(1));
      expect(api.exporterSimulation).toHaveBeenCalledWith(1, "sim-1", "token-1");
      await waitFor(() => result.current.isSuccess);
      expect(result.current.data).toBe("<html></html>");
    });
  });
});
