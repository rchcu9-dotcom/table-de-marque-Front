import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import ParametresSportifsPage from "../ParametresSportifsPage";
import type { ParametresSportifs, EditionJour } from "../../api/parametresSportifs";
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

vi.mock("../../api/parametresSportifs", () => ({
  fetchParametresSportifs: vi.fn(),
  updateParametresSportifs: vi.fn(),
  fetchEditionJours: vi.fn(),
  upsertEditionJour: vi.fn(),
  deleteEditionJour: vi.fn(),
  fetchActivitesCatalogue: vi.fn(),
  createActiviteCatalogue: vi.fn(),
  updateActiviteCatalogue: vi.fn(),
  deleteActiviteCatalogue: vi.fn(),
  fetchCreneauxActivite: vi.fn(),
  createCreneauActivite: vi.fn(),
  updateCreneauActivite: vi.fn(),
  deleteCreneauActivite: vi.fn(),
}));

import * as api from "../../api/parametresSportifs";

const PARAMETRES_MOCK: ParametresSportifs = {
  editionId: 1,
  dureeSurfacageMin: 20,
  dureeMatchPouleMin: 27,
  dureeMatchFinalMin: 33,
  dureeInterMatchMin: null,
  delaiMinActivite: null,
  nbPatinoires: null,
  nbPoules: null,
  nbEquipesParPoule: null,
  nbEquipesQualifieesParPoule: null,
  formatPhaseFinale: null,
  reglesTieBreak: null,
  nbPlacesMax: 16,
};

const JOURS_MOCK: EditionJour[] = [];

let qc: QueryClient;

function renderPage(initialPath = "/admin/parametres-sportifs") {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  vi.spyOn(qc, "invalidateQueries");
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <QueryClientProvider client={qc}>
        <ParametresSportifsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("ParametresSportifsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.fetchParametresSportifs as ReturnType<typeof vi.fn>).mockResolvedValue(PARAMETRES_MOCK);
    (api.fetchEditionJours as ReturnType<typeof vi.fn>).mockResolvedValue(JOURS_MOCK);
    (api.fetchActivitesCatalogue as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (api.fetchCreneauxActivite as ReturnType<typeof vi.fn>).mockResolvedValue([]);
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
    expect(screen.getByText("Réservé à l'organisateur.")).toBeInTheDocument();
  });

  it("charge et affiche les paramètres sportifs pour un organisateur", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "CLOTUREE" },
      isLoading: false,
    });
    renderPage();

    expect(await screen.findByText("Durées et patinoires")).toBeInTheDocument();
    expect(api.fetchParametresSportifs).toHaveBeenCalledWith(1, "test-token");
    expect(screen.getByText("Format de compétition")).toBeInTheDocument();
    expect(screen.getByText("Jours de compétition")).toBeInTheDocument();
    expect(screen.getByText("Catalogue d'Activités")).toBeInTheDocument();
    expect(screen.getByText("Créneaux d'activité")).toBeInTheDocument();
    expect(api.fetchActivitesCatalogue).toHaveBeenCalledWith(1, "test-token");
    expect(api.fetchCreneauxActivite).toHaveBeenCalledWith(1, "test-token");
  });

  it("affiche le fil d'ariane Accueil > Admin > Paramètres sportifs pour un organisateur", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "CLOTUREE" },
      isLoading: false,
    });
    renderPage();

    expect(await screen.findByText("Accueil")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getAllByText("Paramètres sportifs").length).toBeGreaterThan(0);
  });
});

describe("ParametresSportifsPage — cycle annuel de l'édition (spec §3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.fetchParametresSportifs as ReturnType<typeof vi.fn>).mockResolvedValue(PARAMETRES_MOCK);
    (api.fetchEditionJours as ReturnType<typeof vi.fn>).mockResolvedValue(JOURS_MOCK);
    (api.fetchActivitesCatalogue as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (api.fetchCreneauxActivite as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("cible l'édition en préparation (et non l'édition active) quand une édition CREATION_NOUVEAU_TOURNOI existe", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "CLOTUREE" },
      isLoading: false,
    });
    mockUseEditionEnPreparation.mockReturnValue({ data: { id: 2, etape: "CREATION_NOUVEAU_TOURNOI" } });
    renderPage();

    await screen.findByText("Durées et patinoires");
    expect(api.fetchParametresSportifs).toHaveBeenCalledWith(2, "test-token");
    expect(api.fetchParametresSportifs).not.toHaveBeenCalledWith(1, "test-token");
  });

  it("retombe sur l'édition active quand aucune édition en préparation n'existe", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "CLOTUREE" },
      isLoading: false,
    });
    mockUseEditionEnPreparation.mockReturnValue({ data: null });
    renderPage();

    await screen.findByText("Durées et patinoires");
    expect(api.fetchParametresSportifs).toHaveBeenCalledWith(1, "test-token");
  });

  it("?edition=demarree : cible l'édition démarrée même si une édition en préparation existe, en lecture seule", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "TOURNOI_DEMARRE" },
      isLoading: false,
    });
    mockUseEditionEnPreparation.mockReturnValue({ data: { id: 2, etape: "CREATION_NOUVEAU_TOURNOI" } });
    renderPage("/admin/parametres-sportifs?edition=demarree");

    await screen.findByText("Durées et patinoires");
    expect(api.fetchParametresSportifs).toHaveBeenCalledWith(1, "test-token");
    expect(api.fetchParametresSportifs).not.toHaveBeenCalledWith(2, "test-token");
    expect(screen.getByRole("status")).toHaveTextContent(MESSAGE_FORMULE_FIGEE);
    expect(screen.queryByRole("button", { name: "Enregistrer" })).not.toBeInTheDocument();
  });

  it("sans paramètre : n'affiche pas la bannière lecture seule et garde Enregistrer actif", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape: "CLOTUREE" },
      isLoading: false,
    });
    mockUseEditionEnPreparation.mockReturnValue({ data: null });
    renderPage();

    await screen.findByText("Durées et patinoires");
    expect(
      screen.queryByText(/Consultation en lecture seule de l'édition démarrée/),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Enregistrer" }).length).toBeGreaterThan(0);
  });
});

describe("ParametresSportifsPage — formule sportive figée au lancement (spec § 2.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.fetchParametresSportifs as ReturnType<typeof vi.fn>).mockResolvedValue(PARAMETRES_MOCK);
    (api.fetchEditionJours as ReturnType<typeof vi.fn>).mockResolvedValue(JOURS_MOCK);
    (api.fetchActivitesCatalogue as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (api.fetchCreneauxActivite as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    mockUseEditionEnPreparation.mockReturnValue({ data: null });
  });

  function session(etape: string) {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { id: 1, etape },
      isLoading: false,
    });
  }

  it("TOURNOI_DEMARRE sans ?edition=demarree : lecture seule, bandeau et lien vers l'accueil admin (CA 3)", async () => {
    session("TOURNOI_DEMARRE");
    renderPage();

    await screen.findByText("Durées et patinoires");
    const bandeau = screen.getByRole("status");
    expect(bandeau).toHaveTextContent(MESSAGE_FORMULE_FIGEE);
    expect(within(bandeau).getByRole("link", { name: "Accueil admin" })).toHaveAttribute("href", "/admin");
    expect(screen.queryByRole("button", { name: "Enregistrer" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Consultation en lecture seule de l'édition démarrée/)).not.toBeInTheDocument();
  });

  it.each(["CREEE", "CREATION_NOUVEAU_TOURNOI", "INSCRIPTIONS_OUVERTES", "CLOTUREE"])(
    "%s : tout reste modifiable, sans bandeau (CA 1 et 6)",
    async (etape) => {
      session(etape);
      renderPage();

      await screen.findByText("Durées et patinoires");
      expect(screen.queryByText(MESSAGE_FORMULE_FIGEE)).not.toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "Enregistrer" }).length).toBeGreaterThan(0);
    },
  );

  it("édition active lancée mais édition en préparation : cible la préparation, modifiable", async () => {
    session("TOURNOI_DEMARRE");
    mockUseEditionEnPreparation.mockReturnValue({ data: { id: 2, etape: "CREATION_NOUVEAU_TOURNOI" } });
    renderPage();

    await screen.findByText("Durées et patinoires");
    expect(api.fetchParametresSportifs).toHaveBeenCalledWith(2, "test-token");
    expect(screen.queryByText(MESSAGE_FORMULE_FIGEE)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Enregistrer" }).length).toBeGreaterThan(0);
  });

  it("409 reçu (onglet ouvert avant le lancement) : message du back et resynchronisation de l'édition (CA 11)", async () => {
    (api.updateParametresSportifs as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ServerError(409, MESSAGE_FORMULE_FIGEE),
    );
    session("CLOTUREE");
    renderPage();

    await screen.findByText("Durées et patinoires");
    fireEvent.click(screen.getAllByRole("button", { name: "Enregistrer" })[0]);

    await waitFor(() => expect(api.updateParametresSportifs).toHaveBeenCalled());
    expect(
      (await screen.findAllByRole("alert")).some((a) => a.textContent?.includes(MESSAGE_FORMULE_FIGEE)),
    ).toBe(true);
    await waitFor(() =>
      expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["inscription", "edition-courante"] }),
    );
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["inscription", "edition-en-preparation"] });
  });
});
