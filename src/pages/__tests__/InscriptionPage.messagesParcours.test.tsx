// Tests — câblage des messages du parcours d'inscription (edition.msg*) sur les moments réels
// où ils s'affichent, suite au diagnostic confirmé en session : msgEquipeRefusee vide affichait
// un texte VIDE (pas le repli — `??` ne se déclenche pas sur une chaîne vide, seulement sur
// null/undefined) ; msgInscriptionEnCours et msgInscriptionValidee étaient remplis par
// l'organisateur mais jamais lus nulle part (DOSSIER_COMPLET et "candidature déjà en cours"
// affichaient un texte figé) ; msgAjoutEquipe idem pour la modale "Ajouter une équipe".
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../api/env", () => ({
  getApiBaseUrl: () => "http://localhost:3000",
}));

const mockGetIdToken = vi.fn().mockResolvedValue("fake-firebase-token");
const UID = "test-uid-123";
const mockUser = {
  getIdToken: mockGetIdToken,
  uid: UID,
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
  localStorage.clear();
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
  mockFetchProfilInscription.mockResolvedValue({
    id: 1,
    pseudo: "CapitaineRennes",
    role: "RESPONSABLE_EQUIPE",
  });
  mockFetchEquipesReferentiel.mockResolvedValue([]);

  ({ default: InscriptionPage } = await import("../InscriptionPage"));
});

const FALLBACK_REFUS =
  "Nous ne sommes malheureusement pas en mesure de confirmer l'inscription de ton équipe";
const FALLBACK_DOSSIER_COMPLET = "Le dossier de ton équipe a été validé par l'organisateur.";
const FALLBACK_DEJA_EN_COURS = "Rapproche-toi du club ou du porteur de";

describe("InscriptionPage — statut REFUSEE", () => {
  it("affiche le message de repli (jamais un texte vide) quand msgEquipeRefusee est une chaîne vide en base", async () => {
    mockFetchEditionCourante.mockResolvedValue(baseEdition({ msgEquipeRefusee: "" }));
    mockFetchMaCandidature.mockResolvedValue({
      id: 1,
      equipeNom: "Les Coqs",
      equipeLogoUrl: null,
      statut: "REFUSEE",
      createdAt: "2026-05-01T00:00:00.000Z",
    });

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText(new RegExp(FALLBACK_REFUS), { exact: false });
  });

  it("affiche le texte personnalisé quand msgEquipeRefusee est renseigné", async () => {
    mockFetchEditionCourante.mockResolvedValue(
      baseEdition({ msgEquipeRefusee: "Désolé, complet cette année." }),
    );
    mockFetchMaCandidature.mockResolvedValue({
      id: 1,
      equipeNom: "Les Coqs",
      equipeLogoUrl: null,
      statut: "REFUSEE",
      createdAt: "2026-05-01T00:00:00.000Z",
    });

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText("Désolé, complet cette année.");
    expect(screen.queryByText(new RegExp(FALLBACK_REFUS))).not.toBeInTheDocument();
  });
});

describe("InscriptionPage — statut DOSSIER_COMPLET", () => {
  it("affiche msgInscriptionValidee quand renseigné, au lieu du texte figé", async () => {
    mockFetchEditionCourante.mockResolvedValue(
      baseEdition({ msgInscriptionValidee: "Dossier béton, merci !" }),
    );
    mockFetchMaCandidature.mockResolvedValue({
      id: 1,
      equipeNom: "Les Coqs",
      equipeLogoUrl: null,
      statut: "DOSSIER_COMPLET",
      createdAt: "2026-05-01T00:00:00.000Z",
    });

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText("Dossier béton, merci !");
    expect(screen.queryByText(FALLBACK_DOSSIER_COMPLET)).not.toBeInTheDocument();
  });

  it("retombe sur le texte de repli quand msgInscriptionValidee est vide", async () => {
    mockFetchEditionCourante.mockResolvedValue(baseEdition({ msgInscriptionValidee: "" }));
    mockFetchMaCandidature.mockResolvedValue({
      id: 1,
      equipeNom: "Les Coqs",
      equipeLogoUrl: null,
      statut: "DOSSIER_COMPLET",
      createdAt: "2026-05-01T00:00:00.000Z",
    });

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText(FALLBACK_DOSSIER_COMPLET);
  });
});

describe("InscriptionPage — équipe déjà en cours d'inscription (étape 2)", () => {
  it("affiche msgInscriptionEnCours quand renseigné, au lieu du texte figé", async () => {
    mockFetchEditionCourante.mockResolvedValue(
      baseEdition({ msgInscriptionEnCours: "Patience, on revient vers toi vite." }),
    );
    mockFetchMaCandidature.mockResolvedValue(null);
    mockFetchEquipesReferentiel.mockResolvedValue([
      { id: 1, nom: "Les Coqs de Courbevoie", logoUrl: undefined, active: true, candidatureEnCours: true },
    ]);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    const toggle = await screen.findByRole("button", { name: /Choisir une équipe/ });
    fireEvent.click(toggle);
    fireEvent.click(await screen.findByRole("button", { name: /Les Coqs de Courbevoie/ }));

    await screen.findByText("Patience, on revient vers toi vite.");
    expect(screen.queryByText(new RegExp(FALLBACK_DEJA_EN_COURS))).not.toBeInTheDocument();
  });

  it("retombe sur le texte de repli quand msgInscriptionEnCours est vide", async () => {
    mockFetchEditionCourante.mockResolvedValue(baseEdition({ msgInscriptionEnCours: "" }));
    mockFetchMaCandidature.mockResolvedValue(null);
    mockFetchEquipesReferentiel.mockResolvedValue([
      { id: 1, nom: "Les Coqs de Courbevoie", logoUrl: undefined, active: true, candidatureEnCours: true },
    ]);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    const toggle = await screen.findByRole("button", { name: /Choisir une équipe/ });
    fireEvent.click(toggle);
    fireEvent.click(await screen.findByRole("button", { name: /Les Coqs de Courbevoie/ }));

    await screen.findByText(new RegExp(FALLBACK_DEJA_EN_COURS), { exact: false });
  });
});

describe("InscriptionPage — modale Ajouter une équipe", () => {
  it("affiche msgAjoutEquipe en intro quand renseigné", async () => {
    mockFetchEditionCourante.mockResolvedValue(
      baseEdition({ msgAjoutEquipe: "Dis-nous en un peu plus sur votre équipe !" }),
    );
    mockFetchMaCandidature.mockResolvedValue(null);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    fireEvent.click(
      await screen.findByRole("button", { name: /Ton équipe n'est pas présente/ }),
    );

    await screen.findByText("Dis-nous en un peu plus sur votre équipe !");
  });

  it("n'affiche aucune intro quand msgAjoutEquipe est vide", async () => {
    mockFetchEditionCourante.mockResolvedValue(baseEdition({ msgAjoutEquipe: "" }));
    mockFetchMaCandidature.mockResolvedValue(null);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    fireEvent.click(
      await screen.findByRole("button", { name: /Ton équipe n'est pas présente/ }),
    );

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Ajouter une équipe" })).toBeInTheDocument(),
    );
  });
});
