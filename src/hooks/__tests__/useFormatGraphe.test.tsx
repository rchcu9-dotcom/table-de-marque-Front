import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useFormatGraphe,
  formatGrapheQueryKey,
  useCreerPhase,
  useSupprimerPhase,
  useDefinirLien,
  useMarquerElimine,
  useGenererPreset,
} from "../useFormatGraphe";
import * as api from "../../api/formatGraphe";
import type { FormatGraphe } from "../../api/formatGraphe";

vi.mock("../../api/formatGraphe", () => ({
  fetchFormatGraphe: vi.fn(),
  creerPhase: vi.fn(),
  modifierPhase: vi.fn(),
  supprimerPhase: vi.fn(),
  reordonnerPhases: vi.fn(),
  creerGroupe: vi.fn(),
  modifierGroupe: vi.fn(),
  supprimerGroupe: vi.fn(),
  ajouterPlaceAlias: vi.fn(),
  supprimerPlace: vi.fn(),
  definirLien: vi.fn(),
  marquerElimine: vi.fn(),
  reinitialiserLien: vi.fn(),
  associerPhaseJour: vi.fn(),
  dissocierPhaseJour: vi.fn(),
  genererPreset: vi.fn(),
}));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const GRAPHE_MOCK: FormatGraphe = {
  editionId: 1,
  phases: [{ id: 1, editionId: 1, nom: "Brassage", ordre: 1, joursIds: [] }],
  groupes: [],
  liens: [],
  modifieManuellement: false,
  genereDepuisPreset: null,
};

describe("useFormatGraphe", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('utilise la clé de requête ["format-graphe", editionId]', () => {
    expect(formatGrapheQueryKey(3)).toEqual(["format-graphe", 3]);
  });

  it("appelle fetchFormatGraphe avec editionId et token quand les deux sont fournis", async () => {
    (api.fetchFormatGraphe as ReturnType<typeof vi.fn>).mockResolvedValue(GRAPHE_MOCK);

    const { result } = renderHook(() => useFormatGraphe(1, "token-1"), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.fetchFormatGraphe).toHaveBeenCalledWith(1, "token-1");
    expect(result.current.data).toEqual(GRAPHE_MOCK);
  });

  it("n'appelle pas fetchFormatGraphe si le token est absent", () => {
    renderHook(() => useFormatGraphe(1, null), { wrapper: makeWrapper(qc) });
    expect(api.fetchFormatGraphe).not.toHaveBeenCalled();
  });

  it("n'appelle pas fetchFormatGraphe si editionId est undefined", () => {
    renderHook(() => useFormatGraphe(undefined, "token-1"), {
      wrapper: makeWrapper(qc),
    });
    expect(api.fetchFormatGraphe).not.toHaveBeenCalled();
  });

  describe("useCreerPhase", () => {
    it("appelle creerPhase avec l'édition, le payload et le token, puis invalide le cache du graphe", async () => {
      (api.creerPhase as ReturnType<typeof vi.fn>).mockResolvedValue({});
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useCreerPhase(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate({ nom: "Brassage", ordre: 1 });

      await waitFor(() => expect(api.creerPhase).toHaveBeenCalledTimes(1));
      expect(api.creerPhase).toHaveBeenCalledWith(1, { nom: "Brassage", ordre: 1 }, "token-1");
      await waitFor(() =>
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: formatGrapheQueryKey(1) }),
        ),
      );
    });
  });

  describe("useSupprimerPhase", () => {
    it("appelle supprimerPhase avec l'édition, le phaseId et le token", async () => {
      (api.supprimerPhase as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useSupprimerPhase(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate(5);

      await waitFor(() => expect(api.supprimerPhase).toHaveBeenCalledWith(1, 5, "token-1"));
    });
  });

  describe("useDefinirLien", () => {
    it("appelle definirLien avec les identifiants du rang et le groupe cible", async () => {
      (api.definirLien as ReturnType<typeof vi.fn>).mockResolvedValue(GRAPHE_MOCK);

      const { result } = renderHook(() => useDefinirLien(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate({ groupeSourceId: 10, rangSource: 1, groupeCibleId: 20 });

      await waitFor(() =>
        expect(api.definirLien).toHaveBeenCalledWith(1, 10, 1, 20, "token-1"),
      );
    });
  });

  describe("useMarquerElimine", () => {
    it("appelle marquerElimine avec les identifiants du rang", async () => {
      (api.marquerElimine as ReturnType<typeof vi.fn>).mockResolvedValue(GRAPHE_MOCK);

      const { result } = renderHook(() => useMarquerElimine(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate({ groupeSourceId: 10, rangSource: 2 });

      await waitFor(() =>
        expect(api.marquerElimine).toHaveBeenCalledWith(1, 10, 2, "token-1"),
      );
    });
  });

  describe("useGenererPreset", () => {
    it("appelle genererPreset avec le payload complet et invalide le cache après succès", async () => {
      (api.genererPreset as ReturnType<typeof vi.fn>).mockResolvedValue(GRAPHE_MOCK);
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useGenererPreset(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      const payload = {
        preset: "POULES_FINALES" as const,
        nbPoules: 4,
        nbEquipesParPoule: 4,
        nbEquipesQualifieesParPoule: 2,
        forcer: false,
      };
      result.current.mutate(payload);

      await waitFor(() => expect(api.genererPreset).toHaveBeenCalledWith(1, payload, "token-1"));
      await waitFor(() =>
        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: formatGrapheQueryKey(1) }),
        ),
      );
    });
  });
});
