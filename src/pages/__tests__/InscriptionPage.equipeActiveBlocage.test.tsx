import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { storageKey } from "../../utils/selectedEquipePersistence";

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
    fraisInscription: 120,
    prixRepas: 12,
    nbPlacesMax: 16,
    affichagePlanningPublic: false,
    ...overrides,
  };
}

const MESSAGE_BLOCAGE =
  "Cette équipe vient d'être ajoutée et attend la validation de l'organisateur avant de pouvoir être inscrite.";

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
  mockFetchEditionCourante.mockResolvedValue(baseEdition());
  mockFetchProfilInscription.mockResolvedValue({
    id: 1,
    pseudo: "CapitaineRennes",
    role: "RESPONSABLE_EQUIPE",
  });
  // Pas de candidature existante : formulaire à 3 étapes affiché.
  mockFetchMaCandidature.mockResolvedValue(null);

  ({ default: InscriptionPage } = await import("../InscriptionPage"));
});

describe("InscriptionPage — message de blocage « équipe en attente de validation » (docs/specs/la-validation-de-lajout-dune-quipe-car-absnete-du-formulaire.md)", () => {
  it("n'affiche plus le message de blocage pour une équipe fraîchement créée, désormais active: true par défaut (CA1)", async () => {
    mockFetchEquipesReferentiel.mockResolvedValue([
      { id: 1, nom: "Nouvelle Équipe", logoUrl: undefined, active: true },
    ]);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    const toggle = await screen.findByRole("button", { name: /Choisir une équipe/ });
    fireEvent.click(toggle);
    fireEvent.click(await screen.findByRole("button", { name: "Nouvelle Équipe" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Lancer la demande" })).toBeEnabled(),
    );
    expect(screen.queryByText(MESSAGE_BLOCAGE)).not.toBeInTheDocument();
  });

  it("continue d'afficher le message de blocage et de désactiver la soumission pour une équipe active: false (ex. désactivée manuellement par un organisateur, CA3)", async () => {
    // L'équipe existe dans le référentiel mais a été désactivée après coup —
    // sélectionnée ici via la persistance locale (feature indépendante) pour
    // atteindre l'état selectedEquipe.active === false de façon déterministe,
    // sans dépendre du filtrage `actives` du dropdown (qui n'expose que les
    // équipes actives dans sa liste déroulante).
    localStorage.setItem(storageKey(UID), "2");
    mockFetchEquipesReferentiel.mockResolvedValue([
      { id: 2, nom: "Équipe Désactivée", logoUrl: undefined, active: false },
    ]);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText(MESSAGE_BLOCAGE);
    expect(screen.getByRole("button", { name: "Lancer la demande" })).toBeDisabled();
  });
});
