import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useActivitesCatalogue,
  useCreateActiviteCatalogue,
  useUpdateActiviteCatalogue,
  useDeleteActiviteCatalogue,
  activitesCatalogueQueryKey,
} from "../useActivitesCatalogue";
import { creneauxActiviteQueryKey } from "../useCreneauxActivite";
import * as api from "../../api/parametresSportifs";
import type { ActiviteCatalogue } from "../../api/parametresSportifs";

vi.mock("../../api/parametresSportifs", () => ({
  fetchActivitesCatalogue: vi.fn(),
  createActiviteCatalogue: vi.fn(),
  updateActiviteCatalogue: vi.fn(),
  deleteActiviteCatalogue: vi.fn(),
}));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const ACTIVITE_MOCK: ActiviteCatalogue = {
  id: 10,
  editionId: 1,
  label: "Repas",
  dureeParEquipeMin: 40,
  capaciteParallele: 4,
};

describe("useActivitesCatalogue", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('utilise la clé de requête ["activites-catalogue", editionId]', () => {
    expect(activitesCatalogueQueryKey(3)).toEqual(["activites-catalogue", 3]);
  });

  it("appelle fetchActivitesCatalogue avec editionId et token", async () => {
    (api.fetchActivitesCatalogue as ReturnType<typeof vi.fn>).mockResolvedValue([ACTIVITE_MOCK]);

    const { result } = renderHook(() => useActivitesCatalogue(1, "token-1"), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fetchActivitesCatalogue).toHaveBeenCalledWith(1, "token-1");
    expect(result.current.data).toEqual([ACTIVITE_MOCK]);
  });

  it("n'appelle pas fetchActivitesCatalogue si le token est absent", () => {
    renderHook(() => useActivitesCatalogue(1, null), { wrapper: makeWrapper(qc) });
    expect(api.fetchActivitesCatalogue).not.toHaveBeenCalled();
  });

  describe("useCreateActiviteCatalogue", () => {
    it("appelle createActiviteCatalogue et invalide le catalogue", async () => {
      (api.createActiviteCatalogue as ReturnType<typeof vi.fn>).mockResolvedValue(ACTIVITE_MOCK);
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useCreateActiviteCatalogue(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      const payload = { label: "Repas", dureeParEquipeMin: 40, capaciteParallele: 4 };
      result.current.mutate(payload);

      await waitFor(() => expect(api.createActiviteCatalogue).toHaveBeenCalledTimes(1));
      expect(api.createActiviteCatalogue).toHaveBeenCalledWith(1, payload, "token-1");
      await waitFor(() => result.current.isSuccess);
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: activitesCatalogueQueryKey(1) }),
      );
    });
  });

  describe("useUpdateActiviteCatalogue", () => {
    it("appelle updateActiviteCatalogue avec l'id et invalide le catalogue", async () => {
      (api.updateActiviteCatalogue as ReturnType<typeof vi.fn>).mockResolvedValue(ACTIVITE_MOCK);
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useUpdateActiviteCatalogue(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      const payload = { label: "Repas", dureeParEquipeMin: 45, capaciteParallele: 4 };
      result.current.mutate({ id: 10, payload });

      await waitFor(() => expect(api.updateActiviteCatalogue).toHaveBeenCalledTimes(1));
      expect(api.updateActiviteCatalogue).toHaveBeenCalledWith(1, 10, payload, "token-1");
      await waitFor(() => result.current.isSuccess);
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: activitesCatalogueQueryKey(1) }),
      );
    });
  });

  describe("useDeleteActiviteCatalogue", () => {
    it("appelle deleteActiviteCatalogue et invalide le catalogue ET les créneaux (cascade §2.2)", async () => {
      (api.deleteActiviteCatalogue as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useDeleteActiviteCatalogue(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate(10);

      await waitFor(() => expect(api.deleteActiviteCatalogue).toHaveBeenCalledTimes(1));
      expect(api.deleteActiviteCatalogue).toHaveBeenCalledWith(1, 10, "token-1");
      await waitFor(() => result.current.isSuccess);
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: activitesCatalogueQueryKey(1) }),
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: creneauxActiviteQueryKey(1) }),
      );
    });
  });
});
