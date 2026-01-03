import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMomentumMatches } from "../../src/hooks/useMatches";

function createWrapper() {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useMomentumMatches", () => {
  const _apiUrl = "http://localhost:3000/matches/momentum";

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify([
              {
                id: "m1",
                date: "2025-01-01T12:00:00Z",
                teamA: "A",
                teamB: "B",
                status: "ongoing",
                scoreA: 1,
                scoreB: 0
              }
            ])
          )
        )
      ) as unknown as typeof fetch
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appelle l'endpoint momentum et retourne les données", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useMomentumMatches(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calledUrl = (global.fetch as unknown as { mock: { calls: any[][] } }).mock.calls[0][0];
    expect(String(calledUrl)).toMatch(/\/matches\/momentum$/);
    expect(result.current.data?.[0].id).toBe("m1");
    expect(result.current.data?.[0].status).toBe("ongoing");
  });
});
