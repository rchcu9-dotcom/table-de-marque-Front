import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useCreneauxActivite,
  useCreateCreneauActivite,
  useUpdateCreneauActivite,
  useDeleteCreneauActivite,
  creneauxActiviteQueryKey,
} from "../useCreneauxActivite";
import * as api from "../../api/parametresSportifs";
import type { CreneauActivite } from "../../api/parametresSportifs";

vi.mock("../../api/parametresSportifs", () => ({
  fetchCreneauxActivite: vi.fn(),
  createCreneauActivite: vi.fn(),
  updateCreneauActivite: vi.fn(),
  deleteCreneauActivite: vi.fn(),
}));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const CRENEAU_MOCK: CreneauActivite = {
  id: 1,
  editionId: 1,
  activiteId: 10,
  date: "2026-05-23T00:00:00.000Z",
  heureDebut: "2026-05-23T12:00:00.000Z",
  dureeMin: 40,
  equipeId: null,
  equipeLabel: null,
  statut: "LIBRE",
};

describe("useCreneauxActivite", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('utilise la clé de requête ["creneaux-activite", editionId]', () => {
    expect(creneauxActiviteQueryKey(3)).toEqual(["creneaux-activite", 3]);
  });

  it("appelle fetchCreneauxActivite avec editionId et token", async () => {
    (api.fetchCreneauxActivite as ReturnType<typeof vi.fn>).mockResolvedValue([CRENEAU_MOCK]);

    const { result } = renderHook(() => useCreneauxActivite(1, "token-1"), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fetchCreneauxActivite).toHaveBeenCalledWith(1, "token-1");
    expect(result.current.data).toEqual([CRENEAU_MOCK]);
  });

  it("n'appelle pas fetchCreneauxActivite si le token est absent", () => {
    renderHook(() => useCreneauxActivite(1, null), { wrapper: makeWrapper(qc) });
    expect(api.fetchCreneauxActivite).not.toHaveBeenCalled();
  });

  describe("useCreateCreneauActivite", () => {
    it("appelle createCreneauActivite et invalide la liste des créneaux", async () => {
      (api.createCreneauActivite as ReturnType<typeof vi.fn>).mockResolvedValue(CRENEAU_MOCK);
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useCreateCreneauActivite(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      const payload = {
        activiteId: 10,
        date: "2026-05-23",
        heureDebut: "2026-05-23T12:00:00.000Z",
        dureeMin: 40,
      };
      result.current.mutate(payload);

      await waitFor(() => expect(api.createCreneauActivite).toHaveBeenCalledTimes(1));
      expect(api.createCreneauActivite).toHaveBeenCalledWith(1, payload, "token-1");
      await waitFor(() => result.current.isSuccess);
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: creneauxActiviteQueryKey(1) }),
      );
    });
  });

  describe("useUpdateCreneauActivite", () => {
    it("appelle updateCreneauActivite avec l'id et invalide la liste des créneaux", async () => {
      (api.updateCreneauActivite as ReturnType<typeof vi.fn>).mockResolvedValue(CRENEAU_MOCK);
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useUpdateCreneauActivite(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      const payload = {
        activiteId: 10,
        date: "2026-05-23",
        heureDebut: "2026-05-23T13:00:00.000Z",
        dureeMin: 30,
      };
      result.current.mutate({ id: 1, payload });

      await waitFor(() => expect(api.updateCreneauActivite).toHaveBeenCalledTimes(1));
      expect(api.updateCreneauActivite).toHaveBeenCalledWith(1, 1, payload, "token-1");
      await waitFor(() => result.current.isSuccess);
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: creneauxActiviteQueryKey(1) }),
      );
    });
  });

  describe("useDeleteCreneauActivite", () => {
    it("appelle deleteCreneauActivite avec l'id et invalide la liste des créneaux", async () => {
      (api.deleteCreneauActivite as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useDeleteCreneauActivite(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate(1);

      await waitFor(() => expect(api.deleteCreneauActivite).toHaveBeenCalledTimes(1));
      expect(api.deleteCreneauActivite).toHaveBeenCalledWith(1, 1, "token-1");
      await waitFor(() => result.current.isSuccess);
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: creneauxActiviteQueryKey(1) }),
      );
    });
  });
});
