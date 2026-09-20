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
  marquerPaiementRepas: vi.fn(),
  buildImageRibSrc: (editionId: number, imageRibUpdatedAt?: string) =>
    `http://localhost:3000/inscription/editions/${editionId}/image-rib?v=${encodeURIComponent(imageRibUpdatedAt ?? '')}`,
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
    statut: "PAIEMENT_ATTENDU",
    createdAt: "2026-04-01T00:00:00.000Z",
    nbJoueurs: 0,
    fraisInscriptionPaye: false,
    repasPaiementRecu: false,
  });

  ({ default: InscriptionPage } = await import("../InscriptionPage"));
});

describe("InscriptionPage — lien RIB (regression fix imageRibUrl)", () => {
  it("affiche le lien « Voir le RIB » quand edition.imageRibUrl est renseigné", async () => {
    mockFetchEditionCourante.mockResolvedValue({
      id: 1,
      nom: "RCHC U11 2026",
      categorie: "U11",
      annee: 2026,
      etape: "INSCRIPTIONS_OUVERTES",
      dateDebut: "2026-05-23T00:00:00",
      dateFinDebut: "2026-05-01T23:59:59",
      fraisInscription: 120,
      prixRepas: 12,
      nbPlacesMax: 16,
      imageRibUrl: "https://example.com/rib.pdf",
      affichagePlanningPublic: false,
    });

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    const link = await screen.findByRole("link", { name: "Voir le RIB" });
    expect(link).toHaveAttribute("href", "https://example.com/rib.pdf");
  });

  it("n'affiche pas le lien RIB quand imageRibUrl est absent", async () => {
    mockFetchEditionCourante.mockResolvedValue({
      id: 1,
      nom: "RCHC U11 2026",
      categorie: "U11",
      annee: 2026,
      etape: "INSCRIPTIONS_OUVERTES",
      dateDebut: "2026-05-23T00:00:00",
      dateFinDebut: "2026-05-01T23:59:59",
      fraisInscription: 120,
      prixRepas: 12,
      nbPlacesMax: 16,
      affichagePlanningPublic: false,
    });

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText("Rennes")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Voir le RIB" })).not.toBeInTheDocument();
  });

  it("affiche l'image RIB uploadée (balise <img>, pas de lien) quand hasImageRib est vrai (AC4)", async () => {
    mockFetchEditionCourante.mockResolvedValue({
      id: 1,
      nom: "RCHC U11 2026",
      categorie: "U11",
      annee: 2026,
      etape: "INSCRIPTIONS_OUVERTES",
      dateDebut: "2026-05-23T00:00:00",
      dateFinDebut: "2026-05-01T23:59:59",
      fraisInscription: 120,
      prixRepas: 12,
      nbPlacesMax: 16,
      hasImageRib: true,
      imageRibUpdatedAt: "2026-09-16T00:00:00.000Z",
      // URL legacy toujours présente en base mais ne doit plus être utilisée
      // pour le rendu une fois qu'un upload binaire existe (repli prioritaire).
      imageRibUrl: "https://example.com/old-rib.png",
      affichagePlanningPublic: false,
    });

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    const img = await screen.findByAltText("RIB du tournoi");
    expect(img).toHaveAttribute(
      "src",
      "http://localhost:3000/inscription/editions/1/image-rib?v=2026-09-16T00%3A00%3A00.000Z",
    );
    expect(screen.queryByRole("link", { name: /Voir le RIB/ })).not.toBeInTheDocument();
  });

  it("n'affiche aucun bloc image cassé quand ni image uploadée ni URL ne sont configurées (AC5)", async () => {
    mockFetchEditionCourante.mockResolvedValue({
      id: 1,
      nom: "RCHC U11 2026",
      categorie: "U11",
      annee: 2026,
      etape: "INSCRIPTIONS_OUVERTES",
      dateDebut: "2026-05-23T00:00:00",
      dateFinDebut: "2026-05-01T23:59:59",
      fraisInscription: 120,
      prixRepas: 12,
      nbPlacesMax: 16,
      hasImageRib: false,
      affichagePlanningPublic: false,
    });

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText("Rennes")).toBeInTheDocument());
    expect(screen.queryByAltText("RIB du tournoi")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Voir le RIB/ })).not.toBeInTheDocument();
  });
});
