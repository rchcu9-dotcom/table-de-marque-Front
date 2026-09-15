import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  usePresentationArticles,
  useCreatePresentationArticle,
  useUpdatePresentationArticle,
  useDeletePresentationArticle,
  useDeplacerPresentationArticle,
  useUpdatePresentationGroupe,
  useDeplacerPresentationGroupe,
  useDeletePresentationGroupe,
  PRESENTATION_ARTICLES_QUERY_KEY,
} from "../usePresentationArticles";
import { PRESENTATION_QUERY_KEY } from "../usePresentation";
import * as api from "../../api/presentation";
import type { PresentationArticle } from "../../api/presentation";

vi.mock("../../api/presentation", () => ({
  fetchPresentationArticles: vi.fn(),
  createPresentationArticle: vi.fn(),
  updatePresentationArticle: vi.fn(),
  deletePresentationArticle: vi.fn(),
  deplacerPresentationArticle: vi.fn(),
  updatePresentationGroupe: vi.fn(),
  deplacerPresentationGroupe: vi.fn(),
  deletePresentationGroupe: vi.fn(),
}));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const ARTICLE_MOCK: PresentationArticle = {
  id: 1,
  groupe: "Présentation",
  groupeEn: "Presentation",
  titre: "Résumé",
  titreEn: "Summary",
  description: "desc",
  descriptionEn: "desc en",
  surtitre: "",
  surtitreEn: "",
  faits: "",
  faitsEn: "",
  titreAccroche: "", titreAccrocheEn: "", descriptionCourte: "", descriptionCourteEn: "",
  imageUrl: null,
  lienUrl: null,
  lieu: null,
  mapsQuery: null,
  ordre: 0,
  groupeOrdre: 0,
  groupeDureeMs: 5000,
  groupeImageUrl: null,
};

describe("usePresentationArticles", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("fetches the article list when a token is present", async () => {
    vi.mocked(api.fetchPresentationArticles).mockResolvedValue([ARTICLE_MOCK]);

    const { result } = renderHook(() => usePresentationArticles("tok"), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.data).toEqual([ARTICLE_MOCK]));
    expect(api.fetchPresentationArticles).toHaveBeenCalledWith("tok");
  });

  it("does not fetch when there is no token", () => {
    renderHook(() => usePresentationArticles(null), { wrapper: makeWrapper(qc) });
    expect(api.fetchPresentationArticles).not.toHaveBeenCalled();
  });

  it("useCreatePresentationArticle invalidates both the admin list and the public presentation cache", async () => {
    vi.mocked(api.createPresentationArticle).mockResolvedValue(ARTICLE_MOCK);
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useCreatePresentationArticle("tok"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate({
      groupe: "Présentation", groupeEn: "Presentation",
      titre: "Résumé", titreEn: "Summary",
      description: "d", descriptionEn: "d",
      surtitre: "", surtitreEn: "", faits: "", faitsEn: "",
      titreAccroche: "", titreAccrocheEn: "", descriptionCourte: "", descriptionCourteEn: "",
      imageUrl: null, lienUrl: null, lieu: null, mapsQuery: null, ordre: 0,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: PRESENTATION_ARTICLES_QUERY_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: PRESENTATION_QUERY_KEY });
  });

  it("useUpdatePresentationArticle calls the API with id and payload", async () => {
    vi.mocked(api.updatePresentationArticle).mockResolvedValue(ARTICLE_MOCK);

    const { result } = renderHook(() => useUpdatePresentationArticle("tok"), {
      wrapper: makeWrapper(qc),
    });

    const { id: _id, groupeOrdre: _go, groupeDureeMs: _gd, groupeImageUrl: _gi, ...payload } = ARTICLE_MOCK;
    result.current.mutate({ id: 1, payload });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.updatePresentationArticle).toHaveBeenCalledWith(1, payload, "tok");
  });

  it("useDeletePresentationArticle calls the API with id", async () => {
    vi.mocked(api.deletePresentationArticle).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeletePresentationArticle("tok"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.deletePresentationArticle).toHaveBeenCalledWith(1, "tok");
  });

  it("useDeplacerPresentationArticle calls the API with id and direction, and invalidates both caches", async () => {
    vi.mocked(api.deplacerPresentationArticle).mockResolvedValue(undefined);
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useDeplacerPresentationArticle("tok"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate({ id: 1, direction: "haut" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.deplacerPresentationArticle).toHaveBeenCalledWith(1, "haut", "tok");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: PRESENTATION_ARTICLES_QUERY_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: PRESENTATION_QUERY_KEY });
  });

  it("useUpdatePresentationGroupe calls the API with groupe and payload", async () => {
    vi.mocked(api.updatePresentationGroupe).mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdatePresentationGroupe("tok"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate({ groupe: "Présentation", payload: { dureeMs: 8000 } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.updatePresentationGroupe).toHaveBeenCalledWith(
      "Présentation",
      { dureeMs: 8000 },
      "tok",
    );
  });

  it("useDeplacerPresentationGroupe calls the API with groupe and direction", async () => {
    vi.mocked(api.deplacerPresentationGroupe).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeplacerPresentationGroupe("tok"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate({ groupe: "Présentation", direction: "bas" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.deplacerPresentationGroupe).toHaveBeenCalledWith("Présentation", "bas", "tok");
  });

  it("useDeletePresentationGroupe calls the API with groupe and invalidates both caches", async () => {
    vi.mocked(api.deletePresentationGroupe).mockResolvedValue(undefined);
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useDeletePresentationGroupe("tok"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate("Présentation");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.deletePresentationGroupe).toHaveBeenCalledWith("Présentation", "tok");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: PRESENTATION_ARTICLES_QUERY_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: PRESENTATION_QUERY_KEY });
  });
});
