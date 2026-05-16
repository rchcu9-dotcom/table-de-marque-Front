import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMomentumMatches } from "../../src/hooks/useMatches";

const ALL_MATCHES = [
  { id: "m1", date: "2025-01-01T12:00:00Z", teamA: "A", teamB: "B", status: "ongoing", scoreA: 1, scoreB: 0, competitionType: "5v5" },
  { id: "m2", date: "2025-01-01T14:00:00Z", teamA: "C", teamB: "D", status: "planned", scoreA: null, scoreB: null, competitionType: "3v3" },
];

function createWrapper() {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useMomentumMatches", () => {
  beforeEach(() => {
    (globalThis as any).__APP_API_BASE_URL__ = "http://localhost:3000";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(ALL_MATCHES)))
      ) as unknown as typeof fetch
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appelle GET /matches et retourne les données filtrées client-side", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useMomentumMatches({ competitionType: "5v5" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const calledUrl = (globalThis.fetch as unknown as { mock: { calls: any[][] } }).mock.calls[0][0];
    expect(String(calledUrl)).toMatch(/\/matches$/);
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].id).toBe("m1");
    expect(result.current.data?.[0].status).toBe("ongoing");
  });

  it("retourne tous les matchs sans filtre", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useMomentumMatches(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
  });
});
