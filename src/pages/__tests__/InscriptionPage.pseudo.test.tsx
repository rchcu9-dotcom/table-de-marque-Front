import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../api/env", () => ({
  getApiBaseUrl: () => "http://localhost:3000",
}));

const mockGetIdToken = vi.fn().mockResolvedValue("fake-firebase-token");
// uid requis : InscriptionPage appelle queryClient.setQueryData(PROFIL_QUERY_KEY(user.uid), ...)
// après la mise à jour du pseudo. Sans uid, la clé de cache ne correspond pas à celle
// utilisée par useInscriptionSession (qui utilise user?.uid ?? null).
const mockUser = {
  getIdToken: mockGetIdToken,
  uid: "test-uid-123",
} as unknown as import("firebase/auth").User;

const mockUseAuth = vi.fn();
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockFetchEditionCourante = vi.fn();
const mockFetchEquipesReferentiel = vi.fn();
const mockFetchProfilInscription = vi.fn();
const mockUpdatePseudo = vi.fn();
const mockFetchMaCandidature = vi.fn();

vi.mock("../../api/inscription", () => ({
  fetchEditionCourante: (...args: unknown[]) => mockFetchEditionCourante(...args),
  fetchEquipesReferentiel: (...args: unknown[]) => mockFetchEquipesReferentiel(...args),
  createEquipeDemande: vi.fn(),
  fetchProfilInscription: (...args: unknown[]) => mockFetchProfilInscription(...args),
  updatePseudo: (...args: unknown[]) => mockUpdatePseudo(...args),
  fetchMaCandidature: (...args: unknown[]) => mockFetchMaCandidature(...args),
  soumettreCanditature: vi.fn(),
  fetchToutesCandidatures: vi.fn(),
  accepterCandidature: vi.fn(),
  promouvoCandidature: vi.fn(),
  mettreListeAttente: vi.fn(),
  refuserCandidature: vi.fn(),
  validerPaiement: vi.fn(),
  validerDossier: vi.fn(),
  rouvrirDossier: vi.fn(),
}));

let InscriptionPage: typeof import("../InscriptionPage").default;

// InscriptionPage appelle useQueryClient() (TanStack Query) depuis le refactoring
// qui a remplacé useState/useEffect par useInscriptionSession(). Un QueryClientProvider
// est fourni par createWrapper() pour chaque rendu de test.
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  return { queryClient, Wrapper };
}

beforeEach(async () => {
  vi.clearAllMocks();
  mockGetIdToken.mockResolvedValue("fake-firebase-token");
  mockUseAuth.mockReturnValue({
    user: mockUser,
    token: "fake-firebase-token",
    loading: false,
    configured: true,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    logout: vi.fn(),
  });
  mockFetchEditionCourante.mockResolvedValue(null);
  mockFetchEquipesReferentiel.mockResolvedValue([]);
  mockFetchProfilInscription.mockResolvedValue({ id: 1, pseudo: null, role: "RESPONSABLE_EQUIPE" });
  mockFetchMaCandidature.mockResolvedValue(null);

  ({ default: InscriptionPage } = await import("../InscriptionPage"));
});

describe("InscriptionPage — pseudo (faisons connaissance)", () => {
  it("calls the pseudo API and stops showing the screen once the pseudo is saved", async () => {
    mockUpdatePseudo.mockResolvedValue({
      id: 1,
      pseudo: "MikeTrout99",
      role: "RESPONSABLE_EQUIPE",
    });

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    const input = await screen.findByLabelText("Ton pseudo");
    fireEvent.change(input, { target: { value: "MikeTrout99" } });

    const button = screen.getByRole("button", { name: "Valider" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockUpdatePseudo).toHaveBeenCalledWith(
        "MikeTrout99",
        "fake-firebase-token",
      );
    });

    // The "faisons connaissance" screen must disappear once the pseudo is persisted.
    await waitFor(() => {
      expect(screen.queryByLabelText("Ton pseudo")).not.toBeInTheDocument();
    });
  });

  it("shows an error and keeps the screen when the API call fails", async () => {
    mockUpdatePseudo.mockRejectedValue(new Error("network error"));

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    const input = await screen.findByLabelText("Ton pseudo");
    fireEvent.change(input, { target: { value: "MikeTrout99" } });
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => {
      expect(
        screen.getByText("Impossible d'enregistrer le pseudo. Réessaie."),
      ).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Ton pseudo")).toBeInTheDocument();
  });
});
