import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useChangerEtapeInscriptions,
  estConflitEtat,
} from "../useChangerEtapeInscriptions";
import { EDITION_QUERY_KEY } from "../useInscriptionSession";
import { EDITION_EN_PREPARATION_QUERY_KEY } from "../useEditionEnPreparation";
import { ServerError } from "../../api/errors";
import * as api from "../../api/inscription";

vi.mock("../../api/inscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/inscription")>();
  return { ...actual, ouvrirInscriptions: vi.fn(), cloturerInscriptions: vi.fn() };
});

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("useChangerEtapeInscriptions", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it("ouvrir → ouvrirInscriptions(editionId, token), et jamais cloturerInscriptions", async () => {
    (api.ouvrirInscriptions as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 3 });
    const { result } = renderHook(() => useChangerEtapeInscriptions(3, "tok"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate("ouvrir");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.ouvrirInscriptions).toHaveBeenCalledWith(3, "tok");
    expect(api.cloturerInscriptions).not.toHaveBeenCalled();
  });

  it("cloturer → cloturerInscriptions(editionId, token), et jamais ouvrirInscriptions", async () => {
    (api.cloturerInscriptions as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 3 });
    const { result } = renderHook(() => useChangerEtapeInscriptions(3, "tok"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate("cloturer");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.cloturerInscriptions).toHaveBeenCalledWith(3, "tok");
    expect(api.ouvrirInscriptions).not.toHaveBeenCalled();
  });

  it("invalide les caches édition courante ET édition en préparation après succès", async () => {
    (api.ouvrirInscriptions as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 3 });
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();
    const { result } = renderHook(() => useChangerEtapeInscriptions(3, "tok"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate("ouvrir");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: EDITION_QUERY_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: EDITION_EN_PREPARATION_QUERY_KEY });
  });

  it("invalide aussi les deux caches sur un 409 (resynchronisation avec l'état serveur)", async () => {
    (api.cloturerInscriptions as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ServerError(409, "Transition d'étape interdite"),
    );
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();
    const { result } = renderHook(() => useChangerEtapeInscriptions(3, "tok"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate("cloturer");
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(estConflitEtat(result.current.error)).toBe(true);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: EDITION_QUERY_KEY });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: EDITION_EN_PREPARATION_QUERY_KEY });
  });

  it("n'invalide rien sur une autre erreur (ex. 500)", async () => {
    (api.ouvrirInscriptions as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ServerError(500, "boom"),
    );
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();
    const { result } = renderHook(() => useChangerEtapeInscriptions(3, "tok"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate("ouvrir");
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(estConflitEtat(result.current.error)).toBe(false);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("estConflitEtat", () => {
  it("ne reconnaît que ServerError avec status 409", () => {
    expect(estConflitEtat(new ServerError(409, "x"))).toBe(true);
    expect(estConflitEtat(new ServerError(404, "x"))).toBe(false);
    expect(estConflitEtat(new Error("409"))).toBe(false);
    expect(estConflitEtat(null)).toBe(false);
  });
});
