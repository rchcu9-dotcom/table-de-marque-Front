import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useUpdateEdition } from "../useUpdateEdition";
import { EDITION_QUERY_KEY } from "../useInscriptionSession";
import * as api from "../../api/inscription";
import type { Edition } from "../../api/types/inscription.types";

vi.mock("../../api/inscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/inscription")>();
  return { ...actual, updateEdition: vi.fn() };
});

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const EDITION_MOCK: Edition = {
  id: 1,
  nom: "RCHC U11 2026",
  categorie: "U11",
  annee: 2026,
  etape: "CREEE",
  dateDebut: "2026-05-23T00:00:00.000Z",
  dateFinDebut: "2026-05-01T23:59:59.000Z",
  dateFinFin: "2026-05-10T23:59:59.000Z",
  fraisInscription: 120,
  prixRepas: 12,
  nbPlacesMax: 16,
  affichagePlanningPublic: false,
  anneesAge: [],
};

describe("useUpdateEdition", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("appelle updateEdition avec l'édition, le payload et le token", async () => {
    (api.updateEdition as ReturnType<typeof vi.fn>).mockResolvedValue(EDITION_MOCK);

    const { result } = renderHook(() => useUpdateEdition(1, "token-1"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate({ fraisInscription: 150 });

    await waitFor(() => expect(api.updateEdition).toHaveBeenCalledTimes(1));
    expect(api.updateEdition).toHaveBeenCalledWith(1, { fraisInscription: 150 }, "token-1");
  });

  it("invalide EDITION_QUERY_KEY après succès", async () => {
    (api.updateEdition as ReturnType<typeof vi.fn>).mockResolvedValue(EDITION_MOCK);
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

    const { result } = renderHook(() => useUpdateEdition(1, "token-1"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate({ fraisInscription: 150 });
    await waitFor(() => result.current.isSuccess);

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: EDITION_QUERY_KEY }),
    );
  });

  it("n'invalide pas la query quand l'appel API échoue", async () => {
    (api.updateEdition as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

    const { result } = renderHook(() => useUpdateEdition(1, "token-1"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate({ fraisInscription: 150 });
    await waitFor(() => result.current.isError);

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
