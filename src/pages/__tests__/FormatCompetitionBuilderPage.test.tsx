import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import FormatCompetitionBuilderPage from "../FormatCompetitionBuilderPage";
import type { FormatGraphe } from "../../api/formatGraphe";
import { ServerError } from "../../api/errors";
import { MESSAGE_FORMULE_FIGEE } from "../../utils/editionRegles";

const mockUseInscriptionSession = vi.fn();
vi.mock("../../hooks/useInscriptionSession", () => ({
  EDITION_QUERY_KEY: ["inscription", "edition-courante"],
  useInscriptionSession: () => mockUseInscriptionSession(),
}));

const mockUseEditionEnPreparation = vi.fn();
vi.mock("../../hooks/useEditionEnPreparation", () => ({
  EDITION_EN_PREPARATION_QUERY_KEY: ["inscription", "edition-en-preparation"],
  useEditionEnPreparation: () => mockUseEditionEnPreparation(),
}));

vi.mock("../../api/formatGraphe", () => ({
  fetchFormatGraphe: vi.fn(),
  creerPhase: vi.fn(),
  modifierPhase: vi.fn(),
  supprimerPhase: vi.fn(),
  reordonnerPhases: vi.fn(),
  creerGroupe: vi.fn(),
  modifierGroupe: vi.fn(),
  supprimerGroupe: vi.fn(),
  ajouterPlaceAlias: vi.fn(),
  supprimerPlace: vi.fn(),
  definirLien: vi.fn(),
  marquerElimine: vi.fn(),
  reinitialiserLien: vi.fn(),
  associerPhaseJour: vi.fn(),
  dissocierPhaseJour: vi.fn(),
  genererPreset: vi.fn(),
}));

import * as api from "../../api/formatGraphe";

const GRAPHE_MOCK: FormatGraphe = {
  editionId: 1,
  phases: [
    {
      id: 1,
      editionId: 1,
      nom: "Brassage",
      ordre: 1,
      joursIds: [],
    },
  ],
  groupes: [
    {
      id: 10,
      phaseId: 1,
      nom: "Poule A",
      ordre: 1,
      places: [
        { id: 100, groupeId: 10, position: 1, origine: "ALIAS", aliasLabel: "Équipe A", lienEntrantId: null },
        { id: 101, groupeId: 10, position: 2, origine: "ALIAS", aliasLabel: "Équipe B", lienEntrantId: null },
      ],
      liens: [],
    },
  ],
  liens: [
    { id: 1000, groupeSourceId: 10, rangSource: 1, etat: "NON_DEFINI", groupeCibleId: null, placeCibleId: null },
    { id: 1001, groupeSourceId: 10, rangSource: 2, etat: "NON_DEFINI", groupeCibleId: null, placeCibleId: null },
  ],
  modifieManuellement: false,
  genereDepuisPreset: null,
};

let qc: QueryClient;

function renderPage(initialPath = "/admin/format-competition") {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  vi.spyOn(qc, "invalidateQueries");
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <QueryClientProvider client={qc}>
        <FormatCompetitionBuilderPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("FormatCompetitionBuilderPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.fetchFormatGraphe as ReturnType<typeof vi.fn>).mockResolvedValue(GRAPHE_MOCK);
    mockUseEditionEnPreparation.mockReturnValue({ data: null });
  });

  it("affiche un spinner pendant le chargement de la session", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: null,
      token: null,
      edition: null,
      isLoading: true,
    });
    const { container } = renderPage();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("réserve l'accès à l'organisateur", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "TABLE_DE_MARQUE",
      token: "test-token",
      edition: { id: 1, etape: "CLOTUREE" },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText("Reserve a l'organisateur.")).toBeInTheDocument();
  });

  it("charge et affiche le graphe pour un organisateur", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "CLOTUREE" },
      isLoading: false,
    });
    renderPage();

    expect(await screen.findByText("Poule A")).toBeInTheDocument();
    expect(api.fetchFormatGraphe).toHaveBeenCalledWith(1, "test-token");
    expect(screen.getByText("Constructeur de format de competition")).toBeInTheDocument();
  });

  it("propose un retour vers Paramètres sportifs dans le fil d'ariane", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "CLOTUREE" },
      isLoading: false,
    });
    renderPage();

    await screen.findByText("Poule A");
    expect(screen.getByText("Paramètres sportifs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retour" })).toBeInTheDocument();
  });

  it("affiche un message d'erreur avec bouton Réessayer si le chargement échoue", async () => {
    (api.fetchFormatGraphe as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "CLOTUREE" },
      isLoading: false,
    });
    renderPage();

    expect(
      await screen.findByText("Impossible de charger le graphe de competition."),
    ).toBeInTheDocument();
    expect(screen.getByText("Reessayer")).toBeInTheDocument();
  });

  it("cible l'édition en préparation quand une édition CREATION_NOUVEAU_TOURNOI existe", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "CLOTUREE" },
      isLoading: false,
    });
    mockUseEditionEnPreparation.mockReturnValue({
      data: { id: 2, etape: "CREATION_NOUVEAU_TOURNOI" },
    });
    renderPage();

    await waitFor(() => expect(api.fetchFormatGraphe).toHaveBeenCalledWith(2, "test-token"));
    expect(api.fetchFormatGraphe).not.toHaveBeenCalledWith(1, "test-token");
  });

  it("?edition=demarree : cible l'édition démarrée même si une édition en préparation existe, et affiche le bandeau de verrou", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "TOURNOI_DEMARRE" },
      isLoading: false,
    });
    mockUseEditionEnPreparation.mockReturnValue({
      data: { id: 2, etape: "CREATION_NOUVEAU_TOURNOI" },
    });
    renderPage("/admin/format-competition?edition=demarree");

    await waitFor(() => expect(api.fetchFormatGraphe).toHaveBeenCalledWith(1, "test-token"));
    expect(api.fetchFormatGraphe).not.toHaveBeenCalledWith(2, "test-token");
    expect(screen.getByRole("status")).toHaveTextContent(MESSAGE_FORMULE_FIGEE);
  });

  it("?edition=demarree : gèle le canevas (pointer-events-none) pour empêcher toute interaction", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "TOURNOI_DEMARRE" },
      isLoading: false,
    });
    renderPage("/admin/format-competition?edition=demarree");

    await screen.findByText("Poule A");
    const conteneur = screen.getByText("Poule A").closest("[aria-disabled='true']");
    expect(conteneur).toBeTruthy();
    expect(conteneur).toHaveClass("pointer-events-none");
  });

  it("sans paramètre : n'affiche pas la bannière lecture seule et ne gèle pas le canevas", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "CLOTUREE" },
      isLoading: false,
    });
    renderPage();

    await screen.findByText("Poule A");
    expect(
      screen.queryByText(/Consultation en lecture seule de l'édition démarrée/),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Poule A").closest("[aria-disabled='true']")).toBeNull();
  });

  it("TOURNOI_DEMARRE sans ?edition=demarree : lecture seule, bandeau et lien vers l'accueil admin (CA 3)", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "TOURNOI_DEMARRE" },
      isLoading: false,
    });
    renderPage();

    await screen.findByText("Poule A");
    const bandeau = screen.getByRole("status");
    expect(bandeau).toHaveTextContent(MESSAGE_FORMULE_FIGEE);
    expect(within(bandeau).getByRole("link", { name: "Accueil admin" })).toHaveAttribute("href", "/admin");
    expect(screen.getByText("Poule A").closest("[aria-disabled='true']")).toHaveClass("pointer-events-none");
    expect(screen.queryByText(/Consultation en lecture seule de l'édition démarrée/)).not.toBeInTheDocument();
  });

  it.each(["CREEE", "CREATION_NOUVEAU_TOURNOI", "INSCRIPTIONS_OUVERTES", "CLOTUREE"] as const)(
    "%s : graphe modifiable, sans bandeau (CA 1 et 6)",
    async (etape) => {
      mockUseInscriptionSession.mockReturnValue({
        role: "ORGANISATEUR",
        token: "test-token",
        edition: { id: 1, etape },
        isLoading: false,
      });
      renderPage();

      await screen.findByText("Poule A");
      expect(screen.queryByText(MESSAGE_FORMULE_FIGEE)).not.toBeInTheDocument();
      expect(screen.getByText("Poule A").closest("[aria-disabled='true']")).toBeNull();
    },
  );

  it("édition active lancée mais édition en préparation : cible la préparation, modifiable", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "TOURNOI_DEMARRE" },
      isLoading: false,
    });
    mockUseEditionEnPreparation.mockReturnValue({ data: { id: 2, etape: "CREATION_NOUVEAU_TOURNOI" } });
    renderPage();

    await waitFor(() => expect(api.fetchFormatGraphe).toHaveBeenCalledWith(2, "test-token"));
    await screen.findByText("Poule A");
    expect(screen.queryByText(MESSAGE_FORMULE_FIGEE)).not.toBeInTheDocument();
    expect(screen.getByText("Poule A").closest("[aria-disabled='true']")).toBeNull();
  });

  it("409 reçu (onglet ouvert avant le lancement) : message du back et resynchronisation de l'édition (CA 11)", async () => {
    (api.creerPhase as ReturnType<typeof vi.fn>).mockRejectedValue(new ServerError(409, MESSAGE_FORMULE_FIGEE));
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "CLOTUREE" },
      isLoading: false,
    });
    renderPage();

    await screen.findByText("Poule A");
    fireEvent.change(screen.getByPlaceholderText("Nom de la nouvelle phase (ex : Brassage)"), {
      target: { value: "Finales" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Phase" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(MESSAGE_FORMULE_FIGEE);
    await waitFor(() =>
      expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["inscription", "edition-courante"] }),
    );
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["inscription", "edition-en-preparation"] });
  });

  it("déclenche creerPhase quand le formulaire d'ajout de phase est soumis", async () => {
    (api.creerPhase as ReturnType<typeof vi.fn>).mockResolvedValue({});
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "CLOTUREE" },
      isLoading: false,
    });
    renderPage();

    await screen.findByText("Poule A");
    const input = screen.getByPlaceholderText("Nom de la nouvelle phase (ex : Brassage)");
    fireEvent.change(input, { target: { value: "Finales" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Phase" }));

    await waitFor(() =>
      expect(api.creerPhase).toHaveBeenCalledWith(1, { nom: "Finales", ordre: 2 }, "test-token"),
    );
  });
});
