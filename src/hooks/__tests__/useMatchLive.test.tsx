import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useMatchLive, useAjouterBut, matchLiveQueryKey } from "../useMatchLive";
import * as api from "../../api/tableDeMarque";
import type { MatchLiveDetail } from "../../api/tableDeMarque";

vi.mock("../../api/tableDeMarque", () => ({
  fetchMatchLive: vi.fn(),
  annoncerMatch: vi.fn(),
  demarrerMatch: vi.fn(),
  pauserMatch: vi.fn(),
  terminerMatch: vi.fn(),
  editerChrono: vi.fn(),
  ajouterBut: vi.fn(),
  supprimerBut: vi.fn(),
  ajouterPenalite: vi.fn(),
  supprimerPenalite: vi.fn(),
}));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const DETAIL_MOCK: MatchLiveDetail = {
  matchLive: {
    numMatch: 1,
    etat: "PLANIFIE",
    tempsEcouleSecondes: 0,
    chronoEnCours: false,
    chronoDerniereMajAt: null,
    score1Cache: 0,
    score2Cache: 0,
    createdAt: "2026-09-04T10:00:00.000Z",
    updatedAt: "2026-09-04T10:00:00.000Z",
  },
  buts: [],
  penalites: [],
};

describe("useMatchLive", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("utilise la clé de requête [\"match-live\", numMatch]", () => {
    expect(matchLiveQueryKey(42)).toEqual(["match-live", 42]);
  });

  it("appelle fetchMatchLive avec le numMatch et retourne les données", async () => {
    (api.fetchMatchLive as ReturnType<typeof vi.fn>).mockResolvedValue(DETAIL_MOCK);

    const { result } = renderHook(() => useMatchLive(1), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.fetchMatchLive).toHaveBeenCalledWith(1);
    expect(result.current.data).toEqual(DETAIL_MOCK);
  });

  it("n'appelle pas fetchMatchLive si numMatch est undefined", () => {
    renderHook(() => useMatchLive(undefined), {
      wrapper: makeWrapper(qc),
    });

    expect(api.fetchMatchLive).not.toHaveBeenCalled();
  });

  describe("useAjouterBut", () => {
    it("appelle ajouterBut avec le bon numMatch et payload", async () => {
      const mockResult = { ...DETAIL_MOCK.matchLive, score1Cache: 1 };
      (api.ajouterBut as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);
      vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useAjouterBut(1), {
        wrapper: makeWrapper(qc),
      });

      const payload = {
        equipeId: 10,
        buteurId: 101,
        tempsJeuSecondes: 120,
      };

      result.current.mutate({ payload, token: "test-token" });

      await waitFor(() => expect(api.ajouterBut).toHaveBeenCalledTimes(1));
      expect(api.ajouterBut).toHaveBeenCalledWith(1, payload, "test-token");
    });

    it("invalide la clé [\"match-live\", numMatch] après un ajout de but réussi", async () => {
      (api.ajouterBut as ReturnType<typeof vi.fn>).mockResolvedValue({});
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useAjouterBut(1), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate({
        payload: { equipeId: 10, buteurId: 101, tempsJeuSecondes: 120 },
        token: "test-token",
      });

      await waitFor(() => result.current.isSuccess);

      const matchLiveCalls = invalidateSpy.mock.calls.filter(
        (args) =>
          args[0] !== undefined &&
          typeof args[0] === "object" &&
          "queryKey" in (args[0] as object) &&
          JSON.stringify((args[0] as { queryKey: unknown }).queryKey) ===
            JSON.stringify(matchLiveQueryKey(1)),
      );
      expect(matchLiveCalls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
