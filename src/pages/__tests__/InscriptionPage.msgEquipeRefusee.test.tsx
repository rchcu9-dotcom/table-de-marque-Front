import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../api/env", () => ({
  getApiBaseUrl: () => "http://localhost:3000",
}));

const mockGetIdToken = vi.fn().mockResolvedValue("fake-firebase-token");
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
const mockFetchMaCandidature = vi.fn();

vi.mock("../../api/inscription", () => ({
  fetchEditionCourante: (...args: unknown[]) => mockFetchEditionCourante(...args),
  fetchEquipesReferentiel: (...args: unknown[]) => mockFetchEquipesReferentiel(...args),
  createEquipeDemande: vi.fn(),
  fetchProfilInscription: (...args: unknown[]) => mockFetchProfilInscription(...args),
  updatePseudo: vi.fn(),
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

const TEXTE_REPLI_PAR_DEFAUT =
  "Nous ne sommes malheureusement pas en mesure de confirmer l'inscription de ton équipe pour cette édition du tournoi. N'hésite pas à contacter l'organisateur si tu as des questions — et à retenter ta chance lors d'une prochaine édition !";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  return { Wrapper };
}

function baseEdition(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    nom: "RCHC U11 2026",
    categorie: "U11",
    annee: 2026,
    etape: "INSCRIPTIONS_OUVERTES",
    dateDebut: "2026-05-23T00:00:00",
    dateFinDebut: "2026-05-01T23:59:59",
    dateFinFin: "2026-05-10T23:59:59",
    fraisInscription: 120,
    prixRepas: 12,
    nbPlacesMax: 16,
    affichagePlanningPublic: false,
    ...overrides,
  };
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
  mockFetchEquipesReferentiel.mockResolvedValue([]);
  mockFetchProfilInscription.mockResolvedValue({
    id: 1,
    pseudo: "CapitaineRennes",
    role: "RESPONSABLE_EQUIPE",
  });
  mockFetchMaCandidature.mockResolvedValue({
    id: 42,
    equipeNom: "Rennes",
    equipeLogoUrl: null,
    statut: "REFUSEE",
    createdAt: "2026-04-01T00:00:00.000Z",
  });

  ({ default: InscriptionPage } = await import("../InscriptionPage"));
});

describe("InscriptionPage — message équipe refusée (msgEquipeRefusee)", () => {
  it("affiche edition.msgEquipeRefusee quand il est renseigné, plus de texte en dur", async () => {
    mockFetchEditionCourante.mockResolvedValue(
      baseEdition({ msgEquipeRefusee: "Message personnalisé de l'organisateur." }),
    );

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText("Message personnalisé de l'organisateur.");
    expect(
      screen.queryByText(/Ta candidature a été refusée\. Contacte l'organisateur/),
    ).not.toBeInTheDocument();
  });

  it("affiche le texte de repli par défaut quand edition.msgEquipeRefusee est absent", async () => {
    mockFetchEditionCourante.mockResolvedValue(baseEdition());

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText(TEXTE_REPLI_PAR_DEFAUT);
  });

  it("affiche le texte de repli par défaut quand edition.msgEquipeRefusee est null", async () => {
    mockFetchEditionCourante.mockResolvedValue(
      baseEdition({ msgEquipeRefusee: null }),
    );

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText(TEXTE_REPLI_PAR_DEFAUT);
  });

  it("n'affiche aucun message de refus quand le statut n'est pas REFUSEE (non-régression)", async () => {
    mockFetchMaCandidature.mockResolvedValue({
      id: 42,
      equipeNom: "Rennes",
      equipeLogoUrl: null,
      statut: "PAIEMENT_ATTENDU",
      createdAt: "2026-04-01T00:00:00.000Z",
    });
    mockFetchEditionCourante.mockResolvedValue(
      baseEdition({ msgEquipeRefusee: "Ne devrait jamais s'afficher ici." }),
    );

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText("Rennes")).toBeInTheDocument());
    expect(
      screen.queryByText("Ne devrait jamais s'afficher ici."),
    ).not.toBeInTheDocument();
  });
});
