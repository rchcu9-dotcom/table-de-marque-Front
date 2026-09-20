import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { formatFraisInscription } from "../../utils/msgPaiementAttendu";

// Couvre docs/specs/inserer-un-recapitulatif-de-paiement-frais-dinscription-repa.md
// (AC1 à AC8 côté VueResponsable, rôle RESPONSABLE_EQUIPE).

// Intl.NumberFormat insère une espace insécable (U+00A0) avant « € » ; on normalise
// les espaces pour comparer des chaînes équivalentes (même pattern que
// InscriptionPage.paiementAttendu.test.tsx).
function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, " ");
}

// Le texte du récapitulatif est réparti sur plusieurs noeuds (nombres interpolés) :
// on retient le noeud le plus profond dont le textContent contient la chaîne.
function textIncludes(expected: string) {
  const target = normalizeSpaces(expected);
  return (_: string, el: Element | null) => {
    if (!el) return false;
    if (!normalizeSpaces(el.textContent ?? "").includes(target)) return false;
    return Array.from(el.children).every(
      (child) => !normalizeSpaces(child.textContent ?? "").includes(target),
    );
  };
}

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

// DossierPanel est hors périmètre : on le remplace par un panneau minimal dont le
// bouton « Fermer le panneau » déclenche onClose (AC8).
vi.mock("../inscription/DossierPanel", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="dossier-panel">
      <button onClick={onClose}>Fermer le panneau</button>
    </div>
  ),
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

function candidature(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    equipeNom: "Rennes",
    equipeLogoUrl: null,
    statut: "PAIEMENT_ATTENDU",
    createdAt: "2026-04-01T00:00:00.000Z",
    nbJoueurs: 0,
    fraisInscriptionPaye: false,
    repasPaiementRecu: false,
    ...overrides,
  };
}

async function renderPage() {
  const { Wrapper } = createWrapper();
  render(<InscriptionPage />, { wrapper: Wrapper });
  await screen.findByText("Rennes");
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
  mockFetchEditionCourante.mockResolvedValue(baseEdition());
  mockFetchMaCandidature.mockResolvedValue(candidature());

  ({ default: InscriptionPage } = await import("../InscriptionPage"));
});

describe("InscriptionPage (responsable) — récapitulatif de paiement", () => {
  it("PAIEMENT_ATTENDU : affiche les frais d'inscription (300,00 €) avec le badge « Non payé » (AC1)", async () => {
    await renderPage();

    await screen.findByText("Récapitulatif paiement");
    await screen.findByText(
      textIncludes(`Frais d'inscription — ${formatFraisInscription(300)}`),
    );
    // frais non payés + repas non payé
    expect(screen.getAllByText("Non payé")).toHaveLength(2);
  });

  it.each(["VALIDEE", "DOSSIER_EN_COURS", "DOSSIER_COMPLET"])(
    "%s : le badge des frais d'inscription affiche « Payé » (AC2)",
    async (statut) => {
      mockFetchMaCandidature.mockResolvedValue(
        candidature({ statut, fraisInscriptionPaye: true, repasPaiementRecu: false }),
      );

      await renderPage();

      await screen.findByText("Récapitulatif paiement");
      expect(screen.getAllByText("Payé")).toHaveLength(1);
      expect(screen.getAllByText("Non payé")).toHaveLength(1);
    },
  );

  it("dossier de 3 joueurs et prixRepas=12 : affiche « 3 joueur(s) × 12,00 € × 2 jours = 72,00 € » (AC3)", async () => {
    mockFetchMaCandidature.mockResolvedValue(
      candidature({ statut: "DOSSIER_EN_COURS", fraisInscriptionPaye: true, nbJoueurs: 3 }),
    );

    await renderPage();

    await screen.findByText(
      textIncludes(
        `3 joueur(s) × ${formatFraisInscription(12)} × 2 jours = ${formatFraisInscription(72)}`,
      ),
    );
  });

  it("repasPaiementRecu=true : le badge repas affiche « Payé » ; false : « Non payé » (AC4)", async () => {
    mockFetchMaCandidature.mockResolvedValue(
      candidature({ statut: "PAIEMENT_ATTENDU", repasPaiementRecu: true }),
    );
    await renderPage();
    await screen.findByText("Récapitulatif paiement");
    // frais non payés (PAIEMENT_ATTENDU) + repas payé
    expect(screen.getAllByText("Payé")).toHaveLength(1);
    expect(screen.getAllByText("Non payé")).toHaveLength(1);
  });

  it("repasPaiementRecu=false, frais payés : seul le repas est « Non payé » (AC4)", async () => {
    mockFetchMaCandidature.mockResolvedValue(
      candidature({ statut: "VALIDEE", fraisInscriptionPaye: true, repasPaiementRecu: false }),
    );
    await renderPage();

    const repas = await screen.findByText(textIncludes("Repas — "));
    const ligneRepas = repas.closest("div.flex")!;
    expect(ligneRepas).toHaveTextContent("Non payé");
    expect(ligneRepas).not.toHaveTextContent(/Payé/);
  });

  it("candidature sans dossier : affiche « 0 joueur(s) × … = 0,00 € » sans erreur (AC5)", async () => {
    mockFetchMaCandidature.mockResolvedValue(
      candidature({ statut: "VALIDEE", fraisInscriptionPaye: true, nbJoueurs: 0 }),
    );

    await renderPage();

    await screen.findByText(
      textIncludes(
        `0 joueur(s) × ${formatFraisInscription(12)} × 2 jours = ${formatFraisInscription(0)}`,
      ),
    );
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it("RESERVEE : le récapitulatif est affiché (AC1, statut concerné)", async () => {
    mockFetchMaCandidature.mockResolvedValue(candidature({ statut: "RESERVEE" }));

    await renderPage();

    await screen.findByText("Récapitulatif paiement");
  });

  it.each(["CANDIDATE", "LISTE_ATTENTE", "REFUSEE"])(
    "%s : aucun bloc récapitulatif n'est rendu (AC6)",
    async (statut) => {
      mockFetchMaCandidature.mockResolvedValue(candidature({ statut }));

      await renderPage();

      expect(screen.queryByText("Récapitulatif paiement")).not.toBeInTheDocument();
      expect(screen.queryByText(/Frais d'inscription —/)).not.toBeInTheDocument();
      expect(screen.queryByText("Payé")).not.toBeInTheDocument();
      expect(screen.queryByText("Non payé")).not.toBeInTheDocument();
    },
  );

  it("le bloc est en lecture seule : aucun bouton de bascule, phrase d'aide affichée (AC7)", async () => {
    mockFetchMaCandidature.mockResolvedValue(
      candidature({ statut: "PAIEMENT_ATTENDU", nbJoueurs: 2 }),
    );

    await renderPage();

    await screen.findByText("Récapitulatif paiement");
    expect(screen.queryByRole("button", { name: /Marquer/ })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Le statut de paiement est mis à jour par l'organisateur à réception de votre règlement.",
      ),
    ).toBeInTheDocument();
  });

  it("le bloc est affiché sous le message du statut (ordre DOM)", async () => {
    mockFetchEditionCourante.mockResolvedValue(
      baseEdition({ msgPaiementAttendu: "Merci de régler avant le tournoi." }),
    );

    await renderPage();

    const message = await screen.findByText("Merci de régler avant le tournoi.");
    const recap = await screen.findByText("Récapitulatif paiement");
    expect(message.compareDocumentPosition(recap) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("le bloc reste affiché en lecture seule quand le tournoi a démarré (dossier verrouillé)", async () => {
    mockFetchEditionCourante.mockResolvedValue(baseEdition({ etape: "TOURNOI_DEMARRE" }));
    mockFetchMaCandidature.mockResolvedValue(
      candidature({ statut: "VALIDEE", fraisInscriptionPaye: true, nbJoueurs: 5 }),
    );

    await renderPage();

    await screen.findByText("Le tournoi a démarré, les dossiers ne sont plus modifiables.");
    await screen.findByText("Récapitulatif paiement");
    expect(screen.queryByRole("button", { name: /Marquer/ })).not.toBeInTheDocument();
  });

  it("ne rend rien (et ne plante pas) quand l'édition est indisponible", async () => {
    mockFetchEditionCourante.mockResolvedValue(null);

    await renderPage();

    expect(screen.queryByText("Récapitulatif paiement")).not.toBeInTheDocument();
  });
});

describe("InscriptionPage (responsable) — fraîcheur du nombre de joueurs à la fermeture du panneau dossier (AC8)", () => {
  async function ouvrirEtFermerPanneau() {
    fireEvent.click(await screen.findByRole("button", { name: "Renseigner mon dossier" }));
    await screen.findByTestId("dossier-panel");
    fireEvent.click(screen.getByRole("button", { name: "Fermer le panneau" }));
  }

  it("recharge la candidature à la fermeture du panneau et met à jour le nombre de joueurs et le montant repas", async () => {
    let nbJoueurs = 3;
    mockFetchMaCandidature.mockImplementation(async () =>
      candidature({ statut: "VALIDEE", fraisInscriptionPaye: true, nbJoueurs }),
    );

    await renderPage();
    await screen.findByText(
      textIncludes(
        `3 joueur(s) × ${formatFraisInscription(12)} × 2 jours = ${formatFraisInscription(72)}`,
      ),
    );

    // Le responsable ajoute un joueur dans le panneau, puis le ferme.
    nbJoueurs = 4;
    const appelsAvant = mockFetchMaCandidature.mock.calls.length;
    await ouvrirEtFermerPanneau();

    await screen.findByText(
      textIncludes(
        `4 joueur(s) × ${formatFraisInscription(12)} × 2 jours = ${formatFraisInscription(96)}`,
      ),
    );
    expect(mockFetchMaCandidature.mock.calls.length).toBeGreaterThan(appelsAvant);
    expect(screen.queryByTestId("dossier-panel")).not.toBeInTheDocument();
  });

  it("met aussi à jour le montant quand un joueur est supprimé (retour à 0 joueur)", async () => {
    let nbJoueurs = 2;
    mockFetchMaCandidature.mockImplementation(async () =>
      candidature({ statut: "DOSSIER_EN_COURS", fraisInscriptionPaye: true, nbJoueurs }),
    );
    mockFetchEditionCourante.mockResolvedValue(baseEdition());

    await renderPage();
    await screen.findByText(textIncludes("2 joueur(s)"));

    nbJoueurs = 0;
    fireEvent.click(await screen.findByRole("button", { name: "Compléter mon dossier" }));
    await screen.findByTestId("dossier-panel");
    fireEvent.click(screen.getByRole("button", { name: "Fermer le panneau" }));

    await screen.findByText(
      textIncludes(
        `0 joueur(s) × ${formatFraisInscription(12)} × 2 jours = ${formatFraisInscription(0)}`,
      ),
    );
  });

  it("rechargement silencieux : pas de Spinner pendant le rechargement, le récapitulatif reste affiché", async () => {
    mockFetchMaCandidature.mockImplementation(async () =>
      candidature({ statut: "VALIDEE", fraisInscriptionPaye: true, nbJoueurs: 3 }),
    );

    await renderPage();
    await screen.findByText("Récapitulatif paiement");

    // Le prochain appel reste en attente : on observe l'état intermédiaire.
    let resoudre: (v: unknown) => void = () => {};
    mockFetchMaCandidature.mockImplementation(
      () => new Promise((resolve) => (resoudre = resolve)),
    );
    await ouvrirEtFermerPanneau();

    expect(screen.getByText("Rennes")).toBeInTheDocument();
    expect(screen.getByText("Récapitulatif paiement")).toBeInTheDocument();

    resoudre(candidature({ statut: "VALIDEE", fraisInscriptionPaye: true, nbJoueurs: 5 }));
    await screen.findByText(textIncludes("5 joueur(s)"));
  });

  it("échec du rechargement : les données déjà affichées sont conservées, sans message d'erreur", async () => {
    mockFetchMaCandidature.mockImplementation(async () =>
      candidature({ statut: "VALIDEE", fraisInscriptionPaye: true, nbJoueurs: 3 }),
    );

    await renderPage();
    await screen.findByText(textIncludes("3 joueur(s)"));

    mockFetchMaCandidature.mockRejectedValue(new Error("réseau"));
    await ouvrirEtFermerPanneau();

    await waitFor(() => expect(screen.queryByTestId("dossier-panel")).not.toBeInTheDocument());
    expect(screen.getByText(textIncludes("3 joueur(s)"))).toBeInTheDocument();
    expect(screen.queryByText("Impossible de charger votre candidature.")).not.toBeInTheDocument();
  });
});
