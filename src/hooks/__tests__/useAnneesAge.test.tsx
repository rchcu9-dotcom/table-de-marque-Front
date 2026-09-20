import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useAjouterAnneeAge, useRetirerAnneeAge } from "../useAnneesAge";
import { EDITION_QUERY_KEY } from "../useInscriptionSession";
import { EDITION_EN_PREPARATION_QUERY_KEY } from "../useEditionEnPreparation";
import * as api from "../../api/inscription";
import type { Edition } from "../../api/types/inscription.types";

vi.mock("../../api/inscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/inscription")>();
  return { ...actual, ajouterAnneeAge: vi.fn(), retirerAnneeAge: vi.fn() };
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
  fraisInscription: 120,
  prixRepas: 12,
  nbPlacesMax: 16,
  hasImageRib: false,
  affichagePlanningPublic: false,
  anneesAge: [2014, 2015],
};

describe("useAjouterAnneeAge", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("appelle ajouterAnneeAge avec editionId, annee et token", async () => {
    (api.ajouterAnneeAge as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...EDITION_MOCK,
      anneesAge: [2014, 2015, 2016],
    });

    const { result } = renderHook(() => useAjouterAnneeAge(1, "token-1"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate(2016);

    await waitFor(() => expect(api.ajouterAnneeAge).toHaveBeenCalledTimes(1));
    expect(api.ajouterAnneeAge).toHaveBeenCalledWith(1, 2016, "token-1");
  });

  it("invalide EDITION_QUERY_KEY et EDITION_EN_PREPARATION_QUERY_KEY après succès", async () => {
    (api.ajouterAnneeAge as ReturnType<typeof vi.fn>).mockResolvedValue(EDITION_MOCK);
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

    const { result } = renderHook(() => useAjouterAnneeAge(1, "token-1"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate(2016);
    await waitFor(() => result.current.isSuccess);

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: EDITION_QUERY_KEY }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: EDITION_EN_PREPARATION_QUERY_KEY }),
    );
  });

  it("n'invalide pas les queries quand l'appel API échoue", async () => {
    (api.ajouterAnneeAge as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

    const { result } = renderHook(() => useAjouterAnneeAge(1, "token-1"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate(2016);
    await waitFor(() => result.current.isError);

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("useRetirerAnneeAge", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("appelle retirerAnneeAge avec editionId, annee et token", async () => {
    (api.retirerAnneeAge as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...EDITION_MOCK,
      anneesAge: [2015],
    });

    const { result } = renderHook(() => useRetirerAnneeAge(1, "token-1"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate(2014);

    await waitFor(() => expect(api.retirerAnneeAge).toHaveBeenCalledTimes(1));
    expect(api.retirerAnneeAge).toHaveBeenCalledWith(1, 2014, "token-1");
  });

  it("invalide EDITION_QUERY_KEY et EDITION_EN_PREPARATION_QUERY_KEY après succès", async () => {
    (api.retirerAnneeAge as ReturnType<typeof vi.fn>).mockResolvedValue(EDITION_MOCK);
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();

    const { result } = renderHook(() => useRetirerAnneeAge(1, "token-1"), {
      wrapper: makeWrapper(qc),
    });

    result.current.mutate(2014);
    await waitFor(() => result.current.isSuccess);

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: EDITION_QUERY_KEY }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: EDITION_EN_PREPARATION_QUERY_KEY }),
    );
  });
});
