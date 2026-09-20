import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { formatFraisInscription } from "../../utils/msgPaiementAttendu";

// Intl.NumberFormat insère une espace insécable (U+00A0) avant « € » ; le
// normalizer par défaut de Testing Library collapse cette espace dans le texte
// du DOM (regex `\s`, qui matche U+00A0) mais ne touche pas la chaîne passée en
// argument à findByText — on normalise donc nous-mêmes pour comparer des
// chaînes équivalentes après normalisation.
function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, " ");
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

describe("InscriptionPage — message paiement attendu composé (msgChequeInfo2 + RIB image inline)", () => {
  it("remplace {{frais}} par le montant formaté à partir de fraisInscription (CA1)", async () => {
    mockFetchEditionCourante.mockResolvedValue(
      baseEdition({
        fraisInscription: 300,
        msgPaiementAttendu: "Merci de régler {{frais}} avant le tournoi.",
      }),
    );

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText(
      normalizeSpaces(`Merci de régler ${formatFraisInscription(300)} avant le tournoi.`),
    );
  });

  it("affiche le message inchangé quand {{frais}} est absent (CA2, non-régression)", async () => {
    mockFetchEditionCourante.mockResolvedValue(
      baseEdition({ msgPaiementAttendu: "Paiement attendu, merci de patienter." }),
    );

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByText("Paiement attendu, merci de patienter.");
  });

  it("affiche msgChequeInfo1 puis msgChequeInfo2 dans cet ordre quand les deux sont renseignés (CA3)", async () => {
    mockFetchEditionCourante.mockResolvedValue(
      baseEdition({
        msgChequeInfo1: "Chèque à l'ordre du RCHC, à envoyer au 1 rue du Stade.",
        msgChequeInfo2: "Le RIB pour payer par virement est affiché ci-dessous.",
      }),
    );

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    const info1 = await screen.findByText(/Chèque à l'ordre du RCHC/);
    const info2 = await screen.findByText(/Le RIB pour payer par virement/);
    expect(info1).toBeInTheDocument();
    expect(info2).toBeInTheDocument();
    expect(
      info1.compareDocumentPosition(info2) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("n'affiche pas msgChequeInfo2 quand il est vide/null (CA4)", async () => {
    mockFetchEditionCourante.mockResolvedValue(
      baseEdition({
        msgChequeInfo1: "Chèque à l'ordre du RCHC.",
        msgChequeInfo2: null,
      }),
    );

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText("Rennes")).toBeInTheDocument());
    expect(screen.queryByText(/RIB pour payer par virement/)).not.toBeInTheDocument();
  });

  it("affiche le RIB en <img> inline avec un alt explicite, plus le lien « Voir le RIB en grand » (CA5)", async () => {
    mockFetchEditionCourante.mockResolvedValue(
      baseEdition({ imageRibUrl: "https://example.com/rib.png" }),
    );

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    const img = await screen.findByAltText("RIB du tournoi");
    expect(img).toHaveAttribute("src", "https://example.com/rib.png");
    const link = await screen.findByRole("link", { name: "Voir le RIB en grand" });
    expect(link).toHaveAttribute("href", "https://example.com/rib.png");
  });

  it("n'affiche pas d'<img> pour une URL non reconnue comme image (.pdf) — lien seul « Voir le RIB » (CA6)", async () => {
    mockFetchEditionCourante.mockResolvedValue(
      baseEdition({ imageRibUrl: "https://example.com/rib.pdf" }),
    );

    const { Wrapper } = createWrapper();
    render(<InscriptionPage />, { wrapper: Wrapper });

    await screen.findByRole("link", { name: "Voir le RIB" });
    expect(screen.queryByRole("img", { name: "RIB du tournoi" })).not.toBeInTheDocument();
  });
});
