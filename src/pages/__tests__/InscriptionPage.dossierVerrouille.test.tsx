import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// Couvre docs/specs/la-spec-liste-litteralement-deux-libelles-de-menu-sans-menti.md :
// - § Dev : garde `dossierVerrouille` dans VueResponsable (accès direct par URL après
//   TOURNOI_DEMARRE, cf. decisions.json id 1788718694302 et 1788718531652).
// - Critère d'acceptation 5 : message explicite pour un utilisateur sans candidature
//   qui accède directement à /inscription après CLOTUREE ou TOURNOI_DEMARRE.

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

const LOCK_MESSAGE = "Le tournoi a démarré, les dossiers ne sont plus modifiables.";

function mockEdition(etape: string) {
  return {
    id: 1,
    nom: "RCHC U11 2026",
    categorie: "U11",
    annee: 2026,
    etape,
    dateDebut: "2026-05-23T00:00:00",
    dateFinDebut: "2026-05-01T23:59:59",
    dateFinFin: "2026-05-10T23:59:59",
    fraisInscription: 120,
    prixRepas: 12,
    nbPlacesMax: 16,
    affichagePlanningPublic: false,
  };
}

function mockCandidature(statut: string) {
  return {
    id: 1,
    equipeNom: "Rennes",
    equipeLogoUrl: null,
    statut,
    createdAt: "2026-04-01T00:00:00.000Z",
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

  ({ default: InscriptionPage } = await import("../InscriptionPage"));
});

describe("InscriptionPage — verrouillage du dossier après démarrage du tournoi (candidature existante)", () => {
  it("DOSSIER_EN_COURS + TOURNOI_DEMARRE : affiche le message de verrouillage, pas le CTA d'édition", async () => {
    mockFetchEditionCourante.mockResolvedValue(mockEdition("TOURNOI_DEMARRE"));
    mockFetchMaCandidature.mockResolvedValue(mockCandidature("DOSSIER_EN_COURS"));

    render(<InscriptionPage />, { wrapper: createWrapper().Wrapper });

    expect(await screen.findByText(LOCK_MESSAGE)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Compléter mon dossier" }),
    ).not.toBeInTheDocument();
  });

  it("VALIDEE + TOURNOI_DEMARRE : affiche le message de verrouillage, pas le CTA d'édition", async () => {
    mockFetchEditionCourante.mockResolvedValue(mockEdition("TOURNOI_DEMARRE"));
    mockFetchMaCandidature.mockResolvedValue(mockCandidature("VALIDEE"));

    render(<InscriptionPage />, { wrapper: createWrapper().Wrapper });

    expect(await screen.findByText(LOCK_MESSAGE)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Renseigner mon dossier" }),
    ).not.toBeInTheDocument();
  });

  it("DOSSIER_COMPLET + TOURNOI_DEMARRE : non concerné par le verrou, 'Voir mon dossier' reste affiché", async () => {
    mockFetchEditionCourante.mockResolvedValue(mockEdition("TOURNOI_DEMARRE"));
    mockFetchMaCandidature.mockResolvedValue(mockCandidature("DOSSIER_COMPLET"));

    render(<InscriptionPage />, { wrapper: createWrapper().Wrapper });

    expect(
      await screen.findByRole("button", { name: "Voir mon dossier" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(LOCK_MESSAGE)).not.toBeInTheDocument();
  });

  it("DOSSIER_EN_COURS + CLOTUREE (tournoi pas encore démarré) : le dossier reste accessible en écriture", async () => {
    mockFetchEditionCourante.mockResolvedValue(mockEdition("CLOTUREE"));
    mockFetchMaCandidature.mockResolvedValue(mockCandidature("DOSSIER_EN_COURS"));

    render(<InscriptionPage />, { wrapper: createWrapper().Wrapper });

    expect(
      await screen.findByRole("button", { name: "Compléter mon dossier" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(LOCK_MESSAGE)).not.toBeInTheDocument();
  });

  it("VALIDEE + INSCRIPTIONS_OUVERTES : comportement de référence inchangé", async () => {
    mockFetchEditionCourante.mockResolvedValue(mockEdition("INSCRIPTIONS_OUVERTES"));
    mockFetchMaCandidature.mockResolvedValue(mockCandidature("VALIDEE"));

    render(<InscriptionPage />, { wrapper: createWrapper().Wrapper });

    expect(
      await screen.findByRole("button", { name: "Renseigner mon dossier" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(LOCK_MESSAGE)).not.toBeInTheDocument();
  });
});

describe("InscriptionPage — accès direct par URL sans candidature (critère d'acceptation 5)", () => {
  it("CLOTUREE sans candidature : message explicite, pas de formulaire de soumission", async () => {
    mockFetchEditionCourante.mockResolvedValue(mockEdition("CLOTUREE"));
    mockFetchMaCandidature.mockResolvedValue(null);

    render(<InscriptionPage />, { wrapper: createWrapper().Wrapper });

    expect(
      await screen.findByText(
        "Les inscriptions pour cette édition sont désormais clôturées. Aucune nouvelle candidature ne peut être soumise.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Sélectionne ton équipe favorite")).not.toBeInTheDocument();
  });

  it("TOURNOI_DEMARRE sans candidature : message explicite, pas de formulaire de soumission", async () => {
    mockFetchEditionCourante.mockResolvedValue(mockEdition("TOURNOI_DEMARRE"));
    mockFetchMaCandidature.mockResolvedValue(null);

    render(<InscriptionPage />, { wrapper: createWrapper().Wrapper });

    expect(
      await screen.findByText("Le tournoi a déjà démarré. Les inscriptions ne sont plus ouvertes."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Sélectionne ton équipe favorite")).not.toBeInTheDocument();
  });
});
