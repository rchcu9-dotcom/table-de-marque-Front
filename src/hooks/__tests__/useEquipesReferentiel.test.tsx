import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useEquipesReferentielToutes,
  useActiverEquipeReferentiel,
  useDesactiverEquipeReferentiel,
  EQUIPES_REFERENTIEL_TOUTES_QUERY_KEY,
} from "../useEquipesReferentiel";
import * as api from "../../api/inscription";

vi.mock("../../api/inscription", () => ({
  fetchEquipesReferentielToutes: vi.fn(),
  activerEquipeReferentiel: vi.fn(),
  desactiverEquipeReferentiel: vi.fn(),
}));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("useEquipesReferentielToutes", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("appelle fetchEquipesReferentielToutes avec le token quand fourni", async () => {
    (api.fetchEquipesReferentielToutes as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, nom: "Rennes", active: true },
    ]);

    const { result } = renderHook(() => useEquipesReferentielToutes("token-1"), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.fetchEquipesReferentielToutes).toHaveBeenCalledWith("token-1");
    expect(result.current.data).toEqual([{ id: 1, nom: "Rennes", active: true }]);
  });

  it("n'appelle pas fetchEquipesReferentielToutes si le token est absent", () => {
    renderHook(() => useEquipesReferentielToutes(null), { wrapper: makeWrapper(qc) });
    expect(api.fetchEquipesReferentielToutes).not.toHaveBeenCalled();
  });

  describe("useActiverEquipeReferentiel", () => {
    it("appelle activerEquipeReferentiel(id, token) et invalide la liste au succès", async () => {
      (api.activerEquipeReferentiel as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 2,
        nom: "Les Sharks",
        active: true,
      });
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useActiverEquipeReferentiel("token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate(2);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(api.activerEquipeReferentiel).toHaveBeenCalledWith(2, "token-1");
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: EQUIPES_REFERENTIEL_TOUTES_QUERY_KEY }),
      );
    });
  });

  describe("useDesactiverEquipeReferentiel", () => {
    it("appelle desactiverEquipeReferentiel(id, token)", async () => {
      (api.desactiverEquipeReferentiel as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 2,
        nom: "Les Sharks",
        active: false,
      });

      const { result } = renderHook(() => useDesactiverEquipeReferentiel("token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate(2);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(api.desactiverEquipeReferentiel).toHaveBeenCalledWith(2, "token-1");
    });
  });
});
