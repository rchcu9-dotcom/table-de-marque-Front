import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../api/env", () => ({
  getApiBaseUrl: () => "http://localhost:3000",
}));

const mockUser = { uid: "organisateur-uid-1" } as unknown as import("firebase/auth").User;

const mockUseAuth = vi.fn();
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockFetchEditionCourante = vi.fn();
const mockFetchEquipesReferentiel = vi.fn();
const mockFetchProfilInscription = vi.fn();
const mockFetchMaCandidature = vi.fn();
const mockFetchToutesCandidatures = vi.fn();
const mockChangerStatutTriage = vi.fn();
const mockValiderDossier = vi.fn();
const mockRouvrirDossier = vi.fn();

vi.mock("../../api/inscription", () => ({
  fetchEditionCourante: (...args: unknown[]) => mockFetchEditionCourante(...args),
  fetchEquipesReferentiel: (...args: unknown[]) => mockFetchEquipesReferentiel(...args),
  createEquipeDemande: vi.fn(),
  fetchProfilInscription: (...args: unknown[]) => mockFetchProfilInscription(...args),
  updatePseudo: vi.fn(),
  fetchMaCandidature: (...args: unknown[]) => mockFetchMaCandidature(...args),
  soumettreCanditature: vi.fn(),
  fetchToutesCandidatures: (...args: unknown[]) => mockFetchToutesCandidatures(...args),
  changerStatutTriage: (...args: unknown[]) => mockChangerStatutTriage(...args),
  validerPaiement: vi.fn(),
  validerDossier: (...args: unknown[]) => mockValiderDossier(...args),
  rouvrirDossier: (...args: unknown[]) => mockRouvrirDossier(...args),
  marquerPaiementRepas: vi.fn(),
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
    fraisInscription: 300,
    prixRepas: 12,
    nbPlacesMax: 16,
    affichagePlanningPublic: false,
    ...overrides,
  };
}

function baseCandidature(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    equipeNom: "Rennes",
    equipeLogoUrl: null,
    utilisateurEmail: "coach@example.com",
    utilisateurDisplayName: "Coach Dupont",
    statut: "CANDIDATE",
    createdAt: "2026-04-01T00:00:00.000Z",
    nbJoueurs: 0,
    fraisInscriptionPaye: false,
    repasPaiementRecu: false,
    ...overrides,
  };
}

beforeEach(async () => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: mockUser,
    token: "fake-jwt-token",
    loading: false,
    configured: true,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    logout: vi.fn(),
  });
  mockFetchEquipesReferentiel.mockResolvedValue([]);
  mockFetchEditionCourante.mockResolvedValue(baseEdition());
  mockFetchProfilInscription.mockResolvedValue({
    id: 1,
    pseudo: "Organisateur",
    role: "ORGANISATEUR",
  });
  mockFetchMaCandidature.mockResolvedValue(null);

  ({ default: InscriptionPage } = await import("../InscriptionPage"));
});

describe("InscriptionPage — vue organisateur — switch de triage réversible", () => {
  it.each(["CANDIDATE", "PAIEMENT_ATTENDU", "LISTE_ATTENTE", "REFUSEE"])(
    "affiche le switch de triage pour une candidature au statut %s (AC1, AC2, AC9)",
    async (statut) => {
      mockFetchToutesCandidatures.mockResolvedValue([
        baseCandidature({ id: 1, equipeNom: "Rennes", statut }),
      ]);

      const { Wrapper } = createWrapper();
      render(<InscriptionPage />, { wrapper: Wrapper });

      await screen.findByText("Rennes");
      const carte = screen.getByText("Rennes").closest("div.bg-slate-800") as HTMLElement;
      expect(within(carte).getByRole("button", { name: "Accepté" })).toBeInTheDocument();
      expect(within(carte).getByRole("button", { name: "Liste d'attente" })).toBeInTheDocument();
      expect(within(carte).getByRole("button", { name: "Refusé" })).toBeInTheDocument();
    },
  );

  it.each(["VALIDEE", "DOSSIER_EN_COURS", "DOSSIER_COMPLET"])(
    "n'affiche aucun switch de triage pour une candidature au statut %s (AC6)",
    async (statut) => {
      mockFetchToutesCandidatures.mockResolvedValue([
        baseCandidature({ id: 1, equipeNom: "Rennes", statut }),
      ]);

      const { Wrapper } = createWrapper();
      render(<InscriptionPage />, { wrapper: Wrapper });

      await screen.findByText("Rennes");
      const carte = screen.getByText("Rennes").closest("div.bg-slate-800") as HTMLElement;
      expect(within(carte).queryByRole("button", { name: "Accepté" })).not.toBeInTheDocument();
      expect(within(carte).queryByRole("button", { name: "Refusé" })).not.toBeInTheDocument();
    },
  );

  it("appelle changerStatutTriage puis recharge la liste au clic + confirmation sur un segment pâle (AC3)", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockFetchToutesCandidatures
      .mockResolvedValueOnce([
        baseCandidature({ id: 1, equipeNom: "Rennes", statut: "REFUSEE" }),
      ])
      .mockResolvedValueOnce([
        baseCandidature({ id: 1, equipeNom: "Rennes", statut: "PAIEMENT_ATTENDU" }),
      ]);
    mockChangerStatutTriage.mockResolvedValue({ id: 1, statut: "PAIEMENT_ATTENDU" });

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText("Rennes");
    const carte = () => screen.getByText("Rennes").closest("div.bg-slate-800") as HTMLElement;
    fireEvent.click(within(carte()).getByRole("button", { name: "Accepté" }));

    await waitFor(() =>
      expect(mockChangerStatutTriage).toHaveBeenCalledWith(1, "PAIEMENT_ATTENDU", "fake-jwt-token"),
    );
    await waitFor(() => expect(mockFetchToutesCandidatures).toHaveBeenCalledTimes(2));
  });

  it("désactive le segment Accepté quand le plafond de 16 équipes actives est atteint (AC4)", async () => {
    const candidatures = [
      baseCandidature({ id: 1, equipeNom: "Rennes", statut: "LISTE_ATTENTE" }),
      ...Array.from({ length: 16 }, (_, i) =>
        baseCandidature({ id: i + 2, equipeNom: `Equipe${i}`, statut: "VALIDEE" }),
      ),
    ];
    mockFetchToutesCandidatures.mockResolvedValue(candidatures);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText("Rennes");
    const carte = screen.getByText("Rennes").closest("div.bg-slate-800") as HTMLElement;
    const accepte = within(carte).getByRole("button", { name: "Accepté" });
    expect(accepte).toBeDisabled();

    fireEvent.click(accepte);
    expect(mockChangerStatutTriage).not.toHaveBeenCalled();
  });

  it("ne rejoue aucun appel réseau au clic sur le segment déjà actif (AC7)", async () => {
    mockFetchToutesCandidatures.mockResolvedValue([
      baseCandidature({ id: 1, equipeNom: "Rennes", statut: "LISTE_ATTENTE" }),
    ]);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText("Rennes");
    const carte = screen.getByText("Rennes").closest("div.bg-slate-800") as HTMLElement;
    fireEvent.click(within(carte).getByRole("button", { name: "Liste d'attente" }));

    expect(mockChangerStatutTriage).not.toHaveBeenCalled();
    expect(mockFetchToutesCandidatures).toHaveBeenCalledTimes(1);
  });

  it("conserve le bouton « Valider paiement » pour une candidature PAIEMENT_ATTENDU, aux côtés du switch (AC10, non-régression)", async () => {
    mockFetchToutesCandidatures.mockResolvedValue([
      baseCandidature({ id: 1, equipeNom: "Rennes", statut: "PAIEMENT_ATTENDU" }),
    ]);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText("Rennes");
    const carte = screen.getByText("Rennes").closest("div.bg-slate-800") as HTMLElement;
    expect(within(carte).getByRole("button", { name: "Valider paiement" })).toBeInTheDocument();
    expect(within(carte).getByRole("button", { name: "Accepté" })).toBeInTheDocument();
  });
});
