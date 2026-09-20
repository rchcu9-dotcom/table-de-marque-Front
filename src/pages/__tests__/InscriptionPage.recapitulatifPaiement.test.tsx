import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// Même pattern de normalisation d'espace insécable que
// InscriptionPage.paiementAttendu.test.tsx / RecapitulatifPaiement.test.tsx.
function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, " ");
}

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
const mockMarquerPaiementRepas = vi.fn();
const mockDefinirCommentaireOrganisateur = vi.fn();

vi.mock("../../api/inscription", () => ({
  fetchEditionCourante: (...args: unknown[]) => mockFetchEditionCourante(...args),
  fetchEquipesReferentiel: (...args: unknown[]) => mockFetchEquipesReferentiel(...args),
  createEquipeDemande: vi.fn(),
  fetchProfilInscription: (...args: unknown[]) => mockFetchProfilInscription(...args),
  updatePseudo: vi.fn(),
  fetchMaCandidature: (...args: unknown[]) => mockFetchMaCandidature(...args),
  soumettreCanditature: vi.fn(),
  fetchToutesCandidatures: (...args: unknown[]) => mockFetchToutesCandidatures(...args),
  accepterCandidature: vi.fn(),
  promouvoCandidature: vi.fn(),
  mettreListeAttente: vi.fn(),
  refuserCandidature: vi.fn(),
  validerPaiement: vi.fn(),
  validerDossier: vi.fn(),
  rouvrirDossier: vi.fn(),
  marquerPaiementRepas: (...args: unknown[]) => mockMarquerPaiementRepas(...args),
  definirCommentaireOrganisateur: (...args: unknown[]) => mockDefinirCommentaireOrganisateur(...args),
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
    statut: "VALIDEE",
    createdAt: "2026-04-01T00:00:00.000Z",
    nbJoueurs: 3,
    fraisInscriptionPaye: true,
    repasPaiementRecu: false,
    repasDatePaiement: null,
    repasModePaiement: null,
    commentaireOrganisateur: null,
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
  mockMarquerPaiementRepas.mockResolvedValue({
    id: 1,
    equipeNom: "Rennes",
    repasPaiementRecu: true,
    dateReceptionRepas: "2026-09-16T00:00:00.000Z",
    datePaiementRepas: "2026-09-10T00:00:00.000Z",
    repasModePaiement: "CHEQUE",
  });
  mockDefinirCommentaireOrganisateur.mockResolvedValue({ id: 7, commentaireOrganisateur: "Relancer le coach" });

  ({ default: InscriptionPage } = await import("../InscriptionPage"));
});

describe("InscriptionPage — vue organisateur — récapitulatif de paiement", () => {
  it("affiche le bloc récapitulatif pour une candidature au statut VALIDEE (AC6)", async () => {
    mockFetchToutesCandidatures.mockResolvedValue([
      baseCandidature({ id: 1, equipeNom: "Rennes", statut: "VALIDEE" }),
    ]);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText("Rennes");
    expect(screen.getByText("Récapitulatif paiement")).toBeInTheDocument();
  });

  it.each(["CANDIDATE", "LISTE_ATTENTE", "REFUSEE"])(
    "n'affiche aucun bloc récapitulatif pour une candidature au statut %s (AC6)",
    async (statut) => {
      mockFetchToutesCandidatures.mockResolvedValue([
        baseCandidature({ id: 1, equipeNom: "Nantes", statut }),
      ]);

      const { Wrapper } = createWrapper();
      render(<InscriptionPage />, { wrapper: Wrapper });

      await screen.findByText("Nantes");
      expect(screen.queryByText("Récapitulatif paiement")).not.toBeInTheDocument();
    },
  );

  it("appelle marquerPaiementRepas puis recharge la liste au clic sur l'action de bascule (AC4)", async () => {
    mockFetchToutesCandidatures
      .mockResolvedValueOnce([
        baseCandidature({ id: 1, equipeNom: "Rennes", statut: "VALIDEE", repasPaiementRecu: false }),
      ])
      .mockResolvedValueOnce([
        baseCandidature({ id: 1, equipeNom: "Rennes", statut: "VALIDEE", repasPaiementRecu: true }),
      ]);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText("Rennes");
    const carte = screen.getByText("Rennes").closest("div.bg-slate-800") as HTMLElement;
    const boutonBascule = within(carte).getByRole("button", {
      name: "Marquer le repas comme payé",
    });

    fireEvent.click(boutonBascule);

    // Le clic ouvre la modale de saisie : rien n'est envoyé tant que date + type ne sont pas validés.
    await screen.findByText("Valider le paiement des repas");
    expect(mockMarquerPaiementRepas).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Date du paiement"), { target: { value: "2026-09-10" } });
    fireEvent.change(screen.getByLabelText("Type de paiement"), { target: { value: "CHEQUE" } });
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(mockMarquerPaiementRepas).toHaveBeenCalledWith(
        1,
        { paye: true, datePaiement: "2026-09-10", mode: "CHEQUE" },
        "fake-jwt-token",
      ),
    );
    await waitFor(() => expect(mockFetchToutesCandidatures).toHaveBeenCalledTimes(2));
    await within(screen.getByText("Rennes").closest("div.bg-slate-800") as HTMLElement).findByRole(
      "button",
      { name: "Marquer comme non payé" },
    );
  });

  it("propose le type virement par défaut et impose la date avant de valider le paiement des repas", async () => {
    mockFetchToutesCandidatures.mockResolvedValue([
      baseCandidature({ id: 1, equipeNom: "Rennes", statut: "VALIDEE", repasPaiementRecu: false }),
    ]);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText("Rennes");
    fireEvent.click(screen.getByRole("button", { name: "Marquer le repas comme payé" }));
    await screen.findByText("Valider le paiement des repas");

    expect(screen.getByLabelText("Type de paiement")).toHaveValue("VIREMENT");
    expect(screen.getByRole("button", { name: "Valider" })).toBeDisabled();
    expect(
      within(screen.getByLabelText("Type de paiement")).getAllByRole("option").map((o) => o.textContent),
    ).toEqual(["Virement", "Chèque", "Autre"]);
  });

  it("annule le paiement des repas directement (sans modale) avec { paye: false }", async () => {
    mockFetchToutesCandidatures.mockResolvedValue([
      baseCandidature({ id: 1, equipeNom: "Rennes", statut: "VALIDEE", repasPaiementRecu: true }),
    ]);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText("Rennes");
    fireEvent.click(screen.getByRole("button", { name: "Marquer comme non payé" }));

    await waitFor(() =>
      expect(mockMarquerPaiementRepas).toHaveBeenCalledWith(1, { paye: false }, "fake-jwt-token"),
    );
    expect(screen.queryByText("Valider le paiement des repas")).not.toBeInTheDocument();
  });

  it("enregistre le commentaire organisateur d'une équipe puis recharge la liste", async () => {
    mockFetchToutesCandidatures
      .mockResolvedValueOnce([
        baseCandidature({ id: 7, equipeNom: "Rennes", statut: "CANDIDATE", commentaireOrganisateur: null }),
      ])
      .mockResolvedValueOnce([
        baseCandidature({
          id: 7,
          equipeNom: "Rennes",
          statut: "CANDIDATE",
          commentaireOrganisateur: "Relancer le coach",
        }),
      ]);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    // Le champ est présent quel que soit le statut (ici CANDIDATE, sans récapitulatif de paiement).
    await screen.findByText("Rennes");
    fireEvent.change(screen.getByLabelText("Commentaire organisateur"), {
      target: { value: "Relancer le coach" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le commentaire" }));

    await waitFor(() =>
      expect(mockDefinirCommentaireOrganisateur).toHaveBeenCalledWith(7, "Relancer le coach", "fake-jwt-token"),
    );
    await waitFor(() => expect(mockFetchToutesCandidatures).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByLabelText("Commentaire organisateur")).toHaveValue("Relancer le coach"),
    );
  });

  it("affiche les totaux globaux en pied de liste, limités aux candidatures au statut actif (AC7)", async () => {
    mockFetchToutesCandidatures.mockResolvedValue([
      baseCandidature({ id: 1, equipeNom: "Rennes", statut: "VALIDEE", fraisInscriptionPaye: true }),
      baseCandidature({ id: 2, equipeNom: "Paris", statut: "CANDIDATE", fraisInscriptionPaye: false }),
    ]);

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText("Rennes");
    await screen.findByText("Totaux paiements");
    // Seule Rennes (statut actif) compte : 1 payé sur 1 attendu, Paris (CANDIDATE) exclue.
    await screen.findByText((_, el) =>
      !!el &&
      el.children.length === 0 &&
      normalizeSpaces(el.textContent ?? "").includes("Frais d'inscription : 1 payés"),
    );
  });
});
