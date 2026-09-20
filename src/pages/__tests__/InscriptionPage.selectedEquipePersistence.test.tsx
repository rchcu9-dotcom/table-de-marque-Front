import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
const mockSoumettreCanditature = vi.fn();

vi.mock("../../api/inscription", () => ({
  fetchEditionCourante: (...args: unknown[]) => mockFetchEditionCourante(...args),
  fetchEquipesReferentiel: (...args: unknown[]) => mockFetchEquipesReferentiel(...args),
  createEquipeDemande: vi.fn(),
  fetchProfilInscription: (...args: unknown[]) => mockFetchProfilInscription(...args),
  updatePseudo: vi.fn(),
  fetchMaCandidature: (...args: unknown[]) => mockFetchMaCandidature(...args),
  soumettreCanditature: (...args: unknown[]) => mockSoumettreCanditature(...args),
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

const EQUIPES = [
  { id: 1, nom: "Rennes", logoUrl: undefined, active: true },
  { id: 2, nom: "Nantes", logoUrl: undefined, active: true },
];

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
  mockFetchEquipesReferentiel.mockResolvedValue(EQUIPES);
  mockFetchProfilInscription.mockResolvedValue({
    id: 1,
    pseudo: "CapitaineRennes",
    role: "RESPONSABLE_EQUIPE",
  });
  // Pas de candidature existante : VueResponsable affiche le formulaire à 3
  // étapes (sélection d'équipe), pas le récapitulatif.
  mockFetchMaCandidature.mockResolvedValue(null);

  ({ default: InscriptionPage } = await import("../InscriptionPage"));
});

async function selectionnerEquipe(nom: string) {
  const toggle = await screen.findByRole("button", { name: /Choisir une équipe|Rennes|Nantes/ });
  fireEvent.click(toggle);
  const option = await screen.findByRole("button", { name: nom });
  fireEvent.click(option);
}

describe("InscriptionPage — persistance du choix d'équipe (VueResponsable)", () => {
  it("persiste l'équipe sélectionnée sous une clé localStorage namespacée par uid (CA1)", async () => {
    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await selectionnerEquipe("Nantes");

    await waitFor(() =>
      expect(localStorage.getItem(storageKey(UID))).toBe("2"),
    );
  });

  it("le dernier choix prime : changer de sélection met à jour la valeur persistée (CA2)", async () => {
    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await selectionnerEquipe("Nantes");
    await waitFor(() => expect(localStorage.getItem(storageKey(UID))).toBe("2"));

    await selectionnerEquipe("Rennes");
    await waitFor(() => expect(localStorage.getItem(storageKey(UID))).toBe("1"));
  });

  it("réhydrate automatiquement l'équipe précédemment persistée au remontage (CA1)", async () => {
    localStorage.setItem(storageKey(UID), "2");

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByRole("button", { name: /Nantes/ });
  });

  it("efface la valeur persistée après une soumission de candidature réussie (CA3)", async () => {
    mockSoumettreCanditature.mockResolvedValue({
      id: 99,
      equipeNom: "Rennes",
      statut: "CANDIDATE",
      createdAt: "2026-05-01T00:00:00.000Z",
    });

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await selectionnerEquipe("Rennes");
    await waitFor(() => expect(localStorage.getItem(storageKey(UID))).toBe("1"));

    const lancer = await screen.findByRole("button", { name: "Lancer la demande" });
    fireEvent.click(lancer);

    // Le récapitulatif de candidature remplace le formulaire une fois la
    // soumission résolue.
    await screen.findByText("Rennes");
    await waitFor(() => expect(localStorage.getItem(storageKey(UID))).toBeNull());
  });

  it("ne présélectionne rien et ne plante pas quand l'id persisté n'existe plus dans le référentiel (CA5)", async () => {
    localStorage.setItem(storageKey(UID), "999");

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByRole("button", { name: /Choisir une équipe/ });
  });

  it("n'expose jamais la sélection persistée d'un autre uid — pas de fuite entre comptes sur un poste partagé (CA4)", async () => {
    // Un autre responsable a persisté un choix sous SA clé, distincte de celle
    // de l'utilisateur courant (test-uid-123).
    localStorage.setItem(storageKey("autre-responsable-uid"), "1");

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByRole("button", { name: /Choisir une équipe/ });
    // La clé de l'autre responsable reste intacte : aucune écriture croisée.
    expect(localStorage.getItem(storageKey("autre-responsable-uid"))).toBe("1");
  });

  it("n'entre jamais en collision avec la clé « selected-team » de SelectedTeamProvider (CA6)", async () => {
    const valeurSelectedTeam = JSON.stringify({ id: "team-x", name: "Équipe X" });
    localStorage.setItem("selected-team", valeurSelectedTeam);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await selectionnerEquipe("Nantes");
    await waitFor(() => expect(localStorage.getItem(storageKey(UID))).toBe("2"));

    // La clé de SelectedTeamProvider n'a pas été touchée par l'écriture ci-dessus.
    expect(localStorage.getItem("selected-team")).toBe(valeurSelectedTeam);
  });
});
