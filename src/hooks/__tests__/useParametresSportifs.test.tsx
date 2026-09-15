import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useParametresSportifs,
  useUpdateParametresSportifs,
  parametresSportifsQueryKey,
} from "../useParametresSportifs";
import * as api from "../../api/parametresSportifs";
import type { ParametresSportifs } from "../../api/parametresSportifs";

vi.mock("../../api/parametresSportifs", () => ({
  fetchParametresSportifs: vi.fn(),
  updateParametresSportifs: vi.fn(),
}));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const PARAMETRES_MOCK: ParametresSportifs = {
  editionId: 1,
  dureeSurfacageMin: 20,
  dureeMatchPouleMin: 27,
  dureeMatchFinalMin: 33,
  dureeInterMatchMin: null,
  delaiMinActivite: null,
  nbPatinoires: null,
  nbPoules: null,
  nbEquipesParPoule: null,
  nbEquipesQualifieesParPoule: null,
  formatPhaseFinale: null,
  reglesTieBreak: null,
  nbPlacesMax: 16,
};

describe("useParametresSportifs", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('utilise la clé de requête ["parametres-sportifs", editionId]', () => {
    expect(parametresSportifsQueryKey(3)).toEqual(["parametres-sportifs", 3]);
  });

  it("appelle fetchParametresSportifs avec editionId et token quand les deux sont fournis", async () => {
    (api.fetchParametresSportifs as ReturnType<typeof vi.fn>).mockResolvedValue(
      PARAMETRES_MOCK,
    );

    const { result } = renderHook(() => useParametresSportifs(1, "token-1"), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.fetchParametresSportifs).toHaveBeenCalledWith(1, "token-1");
    expect(result.current.data).toEqual(PARAMETRES_MOCK);
  });

  it("n'appelle pas fetchParametresSportifs si le token est absent", () => {
    renderHook(() => useParametresSportifs(1, null), {
      wrapper: makeWrapper(qc),
    });
    expect(api.fetchParametresSportifs).not.toHaveBeenCalled();
  });

  it("n'appelle pas fetchParametresSportifs si editionId est undefined", () => {
    renderHook(() => useParametresSportifs(undefined, "token-1"), {
      wrapper: makeWrapper(qc),
    });
    expect(api.fetchParametresSportifs).not.toHaveBeenCalled();
  });

  describe("useUpdateParametresSportifs", () => {
    it("appelle updateParametresSportifs avec l'édition, le payload et le token", async () => {
      (api.updateParametresSportifs as ReturnType<typeof vi.fn>).mockResolvedValue(
        PARAMETRES_MOCK,
      );

      const { result } = renderHook(
        () => useUpdateParametresSportifs(1, "token-1"),
        { wrapper: makeWrapper(qc) },
      );

      result.current.mutate({ nbPoules: 4 });

      await waitFor(() => expect(api.updateParametresSportifs).toHaveBeenCalledTimes(1));
      expect(api.updateParametresSportifs).toHaveBeenCalledWith(1, { nbPoules: 4 }, "token-1");
    });

    it("invalide la clé de requête des paramètres après succès", async () => {
      (api.updateParametresSportifs as ReturnType<typeof vi.fn>).mockResolvedValue(
        PARAMETRES_MOCK,
      );
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(
        () => useUpdateParametresSportifs(1, "token-1"),
        { wrapper: makeWrapper(qc) },
      );

      result.current.mutate({ nbPoules: 4 });
      await waitFor(() => result.current.isSuccess);

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: parametresSportifsQueryKey(1) }),
      );
    });
  });
});
