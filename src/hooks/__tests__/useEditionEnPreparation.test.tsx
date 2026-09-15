import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useEditionEnPreparation } from "../useEditionEnPreparation";

const mockFetchEditionEnPreparation = vi.fn();

vi.mock("../../api/inscription", () => ({
  fetchEditionEnPreparation: (...args: unknown[]) => mockFetchEditionEnPreparation(...args),
}));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function renderEditionEnPreparation(token: string | null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useEditionEnPreparation(token), { wrapper: makeWrapper(qc) });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useEditionEnPreparation", () => {
  it("n'appelle pas fetchEditionEnPreparation quand aucun token n'est fourni (query désactivée)", async () => {
    const { result } = renderEditionEnPreparation(null);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetchEditionEnPreparation).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it("appelle fetchEditionEnPreparation(token) et expose null quand aucune édition en préparation n'existe", async () => {
    mockFetchEditionEnPreparation.mockResolvedValue(null);

    const { result } = renderEditionEnPreparation("fake-token");

    await waitFor(() => expect(mockFetchEditionEnPreparation).toHaveBeenCalledWith("fake-token"));
    await waitFor(() => expect(result.current.data).toBeNull());
  });

  it("expose l'édition en préparation quand elle existe", async () => {
    mockFetchEditionEnPreparation.mockResolvedValue({
      id: 2,
      nom: "RCHC U11 2027",
      annee: 2027,
      etape: "CREATION_NOUVEAU_TOURNOI",
    });

    const { result } = renderEditionEnPreparation("fake-token");

    await waitFor(() => expect(result.current.data?.id).toBe(2));
    expect(result.current.data?.etape).toBe("CREATION_NOUVEAU_TOURNOI");
  });
});
