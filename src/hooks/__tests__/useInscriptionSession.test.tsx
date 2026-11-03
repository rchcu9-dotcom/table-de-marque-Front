import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useInscriptionSession, DERNIERE_ETAPE_STORAGE_KEY } from "../useInscriptionSession";
import type { StatutInscription } from "../../api/types/inscription.types";

const mockFetchEditionCourante = vi.fn();
const mockFetchProfilInscription = vi.fn();
const mockFetchMaCandidature = vi.fn();

vi.mock("../../api/inscription", () => ({
  fetchEditionCourante: (...args: unknown[]) => mockFetchEditionCourante(...args),
  fetchProfilInscription: (...args: unknown[]) => mockFetchProfilInscription(...args),
  fetchMaCandidature: (...args: unknown[]) => mockFetchMaCandidature(...args),
}));

let mockUser: { uid: string } | null = { uid: "user-1" };
let mockToken: string | null = "fake-token";

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, token: mockToken, loading: false }),
}));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function renderSession() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useInscriptionSession(), { wrapper: makeWrapper(qc) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = { uid: "user-1" };
  mockToken = "fake-token";
  mockFetchEditionCourante.mockResolvedValue({ id: 1, etape: "INSCRIPTIONS_OUVERTES" });
  mockFetchProfilInscription.mockResolvedValue({ id: 1, role: "RESPONSABLE_EQUIPE" });
  mockFetchMaCandidature.mockResolvedValue(null);
});

describe("useInscriptionSession — hasDossierAccess", () => {
  it.each<StatutInscription>(["VALIDEE", "DOSSIER_EN_COURS", "DOSSIER_COMPLET"])(
    "vaut true quand le statut de la candidature est %s",
    async (statut) => {
      mockFetchMaCandidature.mockResolvedValue({
        id: 1,
        equipeNom: "Team",
        equipeLogoUrl: null,
        statut,
        createdAt: new Date().toISOString(),
      });

      const { result } = renderSession();

      await waitFor(() => expect(result.current.hasDossierAccess).toBe(true));
    },
  );

  it.each<StatutInscription>(["CANDIDATE", "LISTE_ATTENTE", "RESERVEE", "PAIEMENT_ATTENDU", "REFUSEE"])(
    "vaut false quand le statut de la candidature est %s",
    async (statut) => {
      mockFetchMaCandidature.mockResolvedValue({
        id: 1,
        equipeNom: "Team",
        equipeLogoUrl: null,
        statut,
        createdAt: new Date().toISOString(),
      });

      const { result } = renderSession();

      await waitFor(() => expect(mockFetchMaCandidature).toHaveBeenCalled());
      expect(result.current.hasDossierAccess).toBe(false);
    },
  );

  it("vaut false quand il n'y a pas encore de candidature (null)", async () => {
    mockFetchMaCandidature.mockResolvedValue(null);

    const { result } = renderSession();

    await waitFor(() => expect(mockFetchMaCandidature).toHaveBeenCalled());
    expect(result.current.hasDossierAccess).toBe(false);
  });

  it("vaut false et n'appelle pas fetchMaCandidature quand personne n'est authentifié (pas de token)", async () => {
    mockUser = null;
    mockToken = null;

    const { result } = renderSession();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasDossierAccess).toBe(false);
    expect(mockFetchMaCandidature).not.toHaveBeenCalled();
  });
});

describe("useInscriptionSession — etape/role", () => {
  it("expose etape depuis l'édition courante et role depuis le profil", async () => {
    mockFetchEditionCourante.mockResolvedValue({ id: 1, etape: "CLOTUREE" });
    mockFetchProfilInscription.mockResolvedValue({ id: 1, role: "ORGANISATEUR" });

    const { result } = renderSession();

    await waitFor(() => expect(result.current.etape).toBe("CLOTUREE"));
    expect(result.current.role).toBe("ORGANISATEUR");
  });
});

describe("useInscriptionSession — étape de l'accueil", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("première visite : en attente tant que le serveur n'a pas répondu", async () => {
    let repondre: (edition: unknown) => void = () => {};
    mockFetchEditionCourante.mockReturnValue(new Promise((r) => { repondre = r; }));

    const { result } = renderSession();

    expect(result.current.etapeAccueil).toBeNull();
    expect(result.current.etapeAccueilEnAttente).toBe(true);
    repondre({ id: 1, etape: "INSCRIPTIONS_OUVERTES" });
    await waitFor(() => expect(result.current.etapeAccueil).toBe("INSCRIPTIONS_OUVERTES"));
    expect(result.current.etapeAccueilEnAttente).toBe(false);
  });

  it("mémorise l'étape reçue, sans expiration", async () => {
    const { result } = renderSession();

    await waitFor(() => expect(result.current.etape).toBe("INSCRIPTIONS_OUVERTES"));
    expect(localStorage.getItem(DERNIERE_ETAPE_STORAGE_KEY)).toBe("INSCRIPTIONS_OUVERTES");
  });

  it("visite suivante : l'accueil part de la dernière étape connue, sans attendre", () => {
    localStorage.setItem(DERNIERE_ETAPE_STORAGE_KEY, "INSCRIPTIONS_OUVERTES");
    mockFetchEditionCourante.mockReturnValue(new Promise(() => {}));

    const { result } = renderSession();

    expect(result.current.etapeAccueil).toBe("INSCRIPTIONS_OUVERTES");
    expect(result.current.etapeAccueilEnAttente).toBe(false);
    // L'étape « officielle » reste celle du serveur : rien n'est autorisé sur une valeur mémorisée.
    expect(result.current.etape).toBeNull();
  });

  it("le serveur a le dernier mot quand l'étape a changé depuis la dernière visite", async () => {
    localStorage.setItem(DERNIERE_ETAPE_STORAGE_KEY, "INSCRIPTIONS_OUVERTES");
    mockFetchEditionCourante.mockResolvedValue({ id: 1, etape: "TOURNOI_DEMARRE" });

    const { result } = renderSession();

    await waitFor(() => expect(result.current.etapeAccueil).toBe("TOURNOI_DEMARRE"));
    expect(localStorage.getItem(DERNIERE_ETAPE_STORAGE_KEY)).toBe("TOURNOI_DEMARRE");
  });

  it("plus d'édition courante : l'étape mémorisée est oubliée", async () => {
    localStorage.setItem(DERNIERE_ETAPE_STORAGE_KEY, "CLOTUREE");
    mockFetchEditionCourante.mockResolvedValue(null);

    const { result } = renderSession();

    await waitFor(() => expect(localStorage.getItem(DERNIERE_ETAPE_STORAGE_KEY)).toBeNull());
    expect(result.current.etapeAccueil).toBeNull();
    expect(result.current.etapeAccueilEnAttente).toBe(false);
  });

  it("ignore une valeur mémorisée inconnue", () => {
    localStorage.setItem(DERNIERE_ETAPE_STORAGE_KEY, "PHASE_INVENTEE");
    mockFetchEditionCourante.mockReturnValue(new Promise(() => {}));

    const { result } = renderSession();

    expect(result.current.etapeAccueil).toBeNull();
    expect(result.current.etapeAccueilEnAttente).toBe(true);
  });
});
