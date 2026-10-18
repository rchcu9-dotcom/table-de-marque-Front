import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useEquipesReferentielToutes,
  useActiverEquipeReferentiel,
  useDesactiverEquipeReferentiel,
  useCreerEquipeReferentiel,
  useModifierEquipeReferentiel,
  EQUIPES_REFERENTIEL_TOUTES_QUERY_KEY,
} from "../useEquipesReferentiel";
import * as api from "../../api/inscription";

vi.mock("../../api/inscription", () => ({
  fetchEquipesReferentielToutes: vi.fn(),
  activerEquipeReferentiel: vi.fn(),
  desactiverEquipeReferentiel: vi.fn(),
  createEquipeDemande: vi.fn(),
  modifierEquipeReferentiel: vi.fn(),
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

  // docs/specs/-prise-en-compte-du-nom-court-pour-les-logos-contexte-actuel.md — CA5
  describe("useCreerEquipeReferentiel", () => {
    it("appelle createEquipeDemande({ nom, nomComplet }, token) et invalide la liste organisateur", async () => {
      (api.createEquipeDemande as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 7,
        nom: "Courbevoie",
        nomComplet: "Les Coqs de Courbevoie",
        active: true,
      });
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useCreerEquipeReferentiel("token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate({ nom: "Courbevoie", nomComplet: "Les Coqs de Courbevoie" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(api.createEquipeDemande).toHaveBeenCalledWith(
        { nom: "Courbevoie", nomComplet: "Les Coqs de Courbevoie" },
        "token-1",
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: EQUIPES_REFERENTIEL_TOUTES_QUERY_KEY }),
      );
    });

    it("n'invalide rien quand la création échoue", async () => {
      (api.createEquipeDemande as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("boom"),
      );
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useCreerEquipeReferentiel("token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate({ nom: "Rennes" });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  // docs/specs/recommandations-finales-contexte-la-mise-en-place-de-la-colo.md — §4, §7
  describe("useModifierEquipeReferentiel", () => {
    it("appelle modifierEquipeReferentiel(id, data, token) et invalide la liste organisateur", async () => {
      (api.modifierEquipeReferentiel as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 7,
        nom: "Courbevoie",
        nomComplet: "Coqs HC",
        active: true,
      });
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useModifierEquipeReferentiel("token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate({ id: 7, data: { nomComplet: "Coqs HC" } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(api.modifierEquipeReferentiel).toHaveBeenCalledWith(
        7,
        { nomComplet: "Coqs HC" },
        "token-1",
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: EQUIPES_REFERENTIEL_TOUTES_QUERY_KEY }),
      );
    });

    it("invalide aussi la liste après un refus : la ligne doit réapparaître verrouillée", async () => {
      (api.modifierEquipeReferentiel as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("409"),
      );
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useModifierEquipeReferentiel("token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate({ id: 7, data: { nom: "Rennes" } });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: EQUIPES_REFERENTIEL_TOUTES_QUERY_KEY }),
      );
    });
  });
});
