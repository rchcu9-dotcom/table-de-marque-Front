import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useEditionJours,
  useUpsertEditionJour,
  useDeleteEditionJour,
  editionJoursQueryKey,
} from "../useEditionJours";
import * as api from "../../api/parametresSportifs";
import type { EditionJour } from "../../api/parametresSportifs";

vi.mock("../../api/parametresSportifs", () => ({
  fetchEditionJours: vi.fn(),
  upsertEditionJour: vi.fn(),
  deleteEditionJour: vi.fn(),
}));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const JOUR_MOCK: EditionJour = {
  id: 1,
  editionId: 1,
  numeroJour: 1,
  date: "2026-05-23",
  heureDebut: "2026-05-23T09:00:00.000Z",
  heureFin: "2026-05-23T21:30:00.000Z",
  typeJournee: "5V5",
};

describe("useEditionJours", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('utilise la clé de requête ["edition-jours", editionId]', () => {
    expect(editionJoursQueryKey(3)).toEqual(["edition-jours", 3]);
  });

  it("appelle fetchEditionJours avec editionId et token", async () => {
    (api.fetchEditionJours as ReturnType<typeof vi.fn>).mockResolvedValue([JOUR_MOCK]);

    const { result } = renderHook(() => useEditionJours(1, "token-1"), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fetchEditionJours).toHaveBeenCalledWith(1, "token-1");
    expect(result.current.data).toEqual([JOUR_MOCK]);
  });

  it("n'appelle pas fetchEditionJours si le token est absent", () => {
    renderHook(() => useEditionJours(1, null), { wrapper: makeWrapper(qc) });
    expect(api.fetchEditionJours).not.toHaveBeenCalled();
  });

  describe("useUpsertEditionJour", () => {
    it("appelle upsertEditionJour et invalide la liste des jours", async () => {
      (api.upsertEditionJour as ReturnType<typeof vi.fn>).mockResolvedValue(JOUR_MOCK);
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useUpsertEditionJour(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      const payload = {
        numeroJour: 1,
        date: "2026-05-23",
        heureDebut: "2026-05-23T09:00:00.000Z",
        heureFin: "2026-05-23T21:30:00.000Z",
        typeJournee: "5V5" as const,
      };
      result.current.mutate(payload);

      await waitFor(() => expect(api.upsertEditionJour).toHaveBeenCalledTimes(1));
      expect(api.upsertEditionJour).toHaveBeenCalledWith(1, payload, "token-1");
      await waitFor(() => result.current.isSuccess);
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: editionJoursQueryKey(1) }),
      );
    });
  });

  describe("useDeleteEditionJour", () => {
    it("appelle deleteEditionJour avec le numéro de jour et invalide la liste", async () => {
      (api.deleteEditionJour as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

      const { result } = renderHook(() => useDeleteEditionJour(1, "token-1"), {
        wrapper: makeWrapper(qc),
      });

      result.current.mutate(2);

      await waitFor(() => expect(api.deleteEditionJour).toHaveBeenCalledTimes(1));
      expect(api.deleteEditionJour).toHaveBeenCalledWith(1, 2, "token-1");
      await waitFor(() => result.current.isSuccess);
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: editionJoursQueryKey(1) }),
      );
    });
  });
});
