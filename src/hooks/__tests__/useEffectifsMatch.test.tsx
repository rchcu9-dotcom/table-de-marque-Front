import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useEffectifsMatch } from "../useEffectifsMatch";
import * as api from "../../api/tableDeMarque";
import type { EffectifsMatch } from "../../api/tableDeMarque";

vi.mock("../../api/tableDeMarque", () => ({
  fetchEffectifsMatch: vi.fn(),
}));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const EFFECTIFS_MOCK: EffectifsMatch = {
  equipe1: { equipeId: 10, nom: "Rennes", joueurs: [], coachs: [] },
  equipe2: { equipeId: 20, nom: "Paris", joueurs: [], coachs: [] },
};

describe("useEffectifsMatch", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("appelle fetchEffectifsMatch avec le numMatch et retourne les données", async () => {
    (api.fetchEffectifsMatch as ReturnType<typeof vi.fn>).mockResolvedValue(EFFECTIFS_MOCK);

    const { result } = renderHook(() => useEffectifsMatch(1), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.fetchEffectifsMatch).toHaveBeenCalledWith(1);
    expect(result.current.data).toEqual(EFFECTIFS_MOCK);
  });

  it("n'appelle pas fetchEffectifsMatch si numMatch est undefined", () => {
    renderHook(() => useEffectifsMatch(undefined), {
      wrapper: makeWrapper(qc),
    });

    expect(api.fetchEffectifsMatch).not.toHaveBeenCalled();
  });
});
