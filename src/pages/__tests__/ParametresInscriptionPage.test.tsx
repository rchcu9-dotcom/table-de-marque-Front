import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import ParametresInscriptionPage from "../ParametresInscriptionPage";
import type { Edition } from "../../api/types/inscription.types";

const mockUseInscriptionSession = vi.fn();
vi.mock("../../hooks/useInscriptionSession", () => ({
  useInscriptionSession: () => mockUseInscriptionSession(),
  EDITION_QUERY_KEY: ["inscription", "edition-courante"],
}));

const mockUseEditionEnPreparation = vi.fn();
vi.mock("../../hooks/useEditionEnPreparation", () => ({
  useEditionEnPreparation: () => mockUseEditionEnPreparation(),
  EDITION_EN_PREPARATION_QUERY_KEY: ["inscription", "edition-en-preparation"],
}));

vi.mock("../../api/inscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/inscription")>();
  return {
    ...actual,
    updateEdition: vi.fn(),
    ajouterAnneeAge: vi.fn(),
    retirerAnneeAge: vi.fn(),
    ouvrirInscriptions: vi.fn(),
    cloturerInscriptions: vi.fn(),
  };
});

import * as api from "../../api/inscription";

const EDITION_MOCK: Edition = {
  id: 1,
  nom: "RCHC U11 2026",
  categorie: "U11",
  annee: 2026,
  etape: "CREEE",
  dateDebut: "2026-04-01T00:00:00",
  dateFinDebut: "2026-05-01T23:59:59",
  fraisInscription: 120,
  prixRepas: 12,
  nbPlacesMax: 16,
  contactEmail: "contact@rchc.fr",
  contactPhone: "0102030405",
  imageUrl: "https://example.com/image.png",
  imageDossierUrl: "https://example.com/dossier.png",
  imageRibUrl: "https://example.com/rib.pdf",
  msgBienvenue: "Bienvenue !",
  hasImageRib: false,
  affichagePlanningPublic: false,
  anneesAge: [2014, 2015],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ParametresInscriptionPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("ParametresInscriptionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      edition: EDITION_MOCK,
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText("Réservé à l'organisateur.")).toBeInTheDocument();
  });

  it("affiche le fil d'ariane et pré-remplit le formulaire depuis l'édition courante", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    renderPage();

    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getAllByText("Paramètres d'inscription").length).toBeGreaterThan(0);

    expect(screen.getByLabelText("Nom du tournoi")).toHaveValue("RCHC U11 2026");
    expect(screen.getByLabelText("Catégorie")).toHaveValue("U11");
    expect(screen.getByLabelText("Début du tournoi")).toHaveValue("2026-04-01");
    expect(screen.getByLabelText("Fin du tournoi")).toHaveValue("2026-05-01");
    expect(screen.queryByLabelText("Fin des inscriptions")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Frais d'inscription (€)")).toHaveValue(120);
    expect(screen.getByLabelText("Prix du repas (€)")).toHaveValue(12);
    expect(screen.getByLabelText("Nombre de places max")).toHaveValue(16);
    expect(screen.getByLabelText("Email de contact")).toHaveValue("contact@rchc.fr");
    // Le champ texte "URL RIB" a été remplacé par ImageRibUploadField (upload
    // binaire) — cf. lcran-qui-affiche-le-paiement-attendu-sur-le-parcours-dinscr.
    // hasImageRib=false ici, donc repli sur l'affichage de l'ancienne URL en lecture
    // seule plutôt qu'un champ texte éditable.
    expect(
      screen.getByRole("link", { name: "https://example.com/rib.pdf" }),
    ).toHaveAttribute("href", "https://example.com/rib.pdf");
  });

  it("affiche l'aperçu de l'image RIB uploadée (ImageRibUploadField) quand hasImageRib est vrai", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: {
        ...EDITION_MOCK,
        hasImageRib: true,
        imageRibUpdatedAt: "2026-09-16T00:00:00.000Z",
      },
      isLoading: false,
    });
    renderPage();

    expect(screen.getByAltText("Aperçu du RIB")).toHaveAttribute(
      "src",
      expect.stringContaining("/inscription/editions/1/image-rib?v="),
    );
  });

  it.each([
    "CREEE",
    "CREATION_NOUVEAU_TOURNOI",
    "INSCRIPTIONS_OUVERTES",
    "CLOTUREE",
    "TOURNOI_DEMARRE",
  ] as const)(
    "n'affiche plus jamais le bandeau « n'est plus au stade créée » (etape=%s) : modifier les paramètres inscriptions ouvertes est le cas normal",
    (etape) => {
      mockUseInscriptionSession.mockReturnValue({
        role: "ORGANISATEUR",
        token: "test-token",
        edition: { ...EDITION_MOCK, etape },
        isLoading: false,
      });
      renderPage();
      expect(screen.queryByText(/n'est plus au stade/)).not.toBeInTheDocument();
    },
  );

  it("intitule la section des dates « Dates du tournoi »", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText("Dates du tournoi")).toBeInTheDocument();
    expect(screen.queryByText(/Fenêtre d'inscription/)).not.toBeInTheDocument();
  });

  it("replie les messages par défaut et les révèle au clic", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    renderPage();

    expect(screen.queryByLabelText(/^Message d'accueil/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Messages du parcours d'inscription/ }));

    expect(screen.getByLabelText(/^Message d'accueil/)).toHaveValue("Bienvenue !");
  });

  it("bloque l'enregistrement et affiche un message explicite pour un quota négatif, sans appel réseau", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    renderPage();

    fireEvent.change(screen.getByLabelText("Nombre de places max"), {
      target: { value: "-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(
      screen.getByText("Le nombre de places ne peut pas être négatif."),
    ).toBeInTheDocument();
    expect(api.updateEdition).not.toHaveBeenCalled();
  });

  it("bloque l'enregistrement et affiche un message explicite quand le nom du tournoi est vide, sans appel réseau", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    renderPage();

    fireEvent.change(screen.getByLabelText("Nom du tournoi"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(screen.getByText("Le nom du tournoi ne peut pas être vide.")).toBeInTheDocument();
    expect(api.updateEdition).not.toHaveBeenCalled();
  });

  it("bloque l'enregistrement et affiche un message explicite quand la catégorie est vide, sans appel réseau", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    renderPage();

    fireEvent.change(screen.getByLabelText("Catégorie"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(screen.getByText("La catégorie ne peut pas être vide.")).toBeInTheDocument();
    expect(api.updateEdition).not.toHaveBeenCalled();
  });

  it("bloque l'enregistrement quand la fin du tournoi est antérieure au début du tournoi", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    renderPage();

    fireEvent.change(screen.getByLabelText("Fin du tournoi"), {
      target: { value: "2026-03-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(
      screen.getByText(
        "La date de fin du tournoi doit être postérieure ou égale à la date de début du tournoi.",
      ),
    ).toBeInTheDocument();
    expect(api.updateEdition).not.toHaveBeenCalled();
  });

  it("n'envoie plus dateFinFin (ni etape) dans le PATCH, même si l'édition en porte encore une valeur historique", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: {
        ...EDITION_MOCK,
        dateFinFin: "2026-05-10T23:59:59",
      } as Edition,
      isLoading: false,
    });
    (api.updateEdition as ReturnType<typeof vi.fn>).mockResolvedValue(EDITION_MOCK);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(api.updateEdition).toHaveBeenCalled());
    const payload = (api.updateEdition as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(payload).not.toHaveProperty("dateFinFin");
    expect(payload).not.toHaveProperty("etape");
  });

  it("enregistre le formulaire modifié et affiche un message de succès", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    (api.updateEdition as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...EDITION_MOCK,
      fraisInscription: 150,
    });
    renderPage();

    fireEvent.change(screen.getByLabelText("Frais d'inscription (€)"), {
      target: { value: "150" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(api.updateEdition).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ fraisInscription: 150 }),
        "test-token",
      ),
    );
    expect(
      await screen.findByText("Paramètres d'inscription enregistrés."),
    ).toBeInTheDocument();
  });

  it("enregistre le nom du tournoi et la catégorie modifiés", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    (api.updateEdition as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...EDITION_MOCK,
      nom: "RCHC U11 2027",
      categorie: "U13",
    });
    renderPage();

    fireEvent.change(screen.getByLabelText("Nom du tournoi"), {
      target: { value: "RCHC U11 2027" },
    });
    fireEvent.change(screen.getByLabelText("Catégorie"), { target: { value: "U13" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(api.updateEdition).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ nom: "RCHC U11 2027", categorie: "U13" }),
        "test-token",
      ),
    );
  });

  it("affiche un message d'erreur explicite quand l'appel API échoue", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    (api.updateEdition as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network"));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(
      await screen.findByText("Impossible d'enregistrer les paramètres d'inscription."),
    ).toBeInTheDocument();
  });
});

describe("ParametresInscriptionPage — cycle annuel de l'édition (spec §3)", () => {
  const EDITION_EN_PREPARATION_MOCK: Edition = {
    ...EDITION_MOCK,
    id: 2,
    nom: "RCHC U11 2027",
    annee: 2027,
    etape: "CREATION_NOUVEAU_TOURNOI",
    fraisInscription: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pré-remplit le formulaire depuis l'édition en préparation (pas l'édition active) quand elle existe", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    mockUseEditionEnPreparation.mockReturnValue({ data: EDITION_EN_PREPARATION_MOCK });
    renderPage();

    expect(screen.getByLabelText("Frais d'inscription (€)")).toHaveValue(0);
  });

  it("enregistre sur l'édition en préparation (id 2), pas sur l'édition active (id 1)", async () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    mockUseEditionEnPreparation.mockReturnValue({ data: EDITION_EN_PREPARATION_MOCK });
    (api.updateEdition as ReturnType<typeof vi.fn>).mockResolvedValue(EDITION_EN_PREPARATION_MOCK);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(api.updateEdition).toHaveBeenCalledWith(2, expect.anything(), "test-token"),
    );
  });

  it("retombe sur l'édition active quand aucune édition en préparation n'existe", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    mockUseEditionEnPreparation.mockReturnValue({ data: null });
    renderPage();

    expect(screen.getByLabelText("Frais d'inscription (€)")).toHaveValue(120);
  });
});

describe("ParametresInscriptionPage — années d'âge (docs/specs/ajoute-dans-les-parametres-dinscription-du-tournoi-les-annes.md)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEditionEnPreparation.mockReturnValue({ data: null });
  });

  it("affiche les années déjà configurées", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    renderPage();

    expect(screen.getByText("2014")).toBeInTheDocument();
    expect(screen.getByText("2015")).toBeInTheDocument();
  });

  it("avertit quand aucune année n'est configurée", () => {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { ...EDITION_MOCK, anneesAge: [] },
      isLoading: false,
    });
    renderPage();

    expect(
      screen.getByText(/Aucune année configurée/),
    ).toBeInTheDocument();
  });

  it("ajoute une année immédiatement (pas besoin du bouton Enregistrer global)", async () => {
    (api.ajouterAnneeAge as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...EDITION_MOCK,
      anneesAge: [2014, 2015, 2016],
    });
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("Ex: 2015"), {
      target: { value: "2016" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    await waitFor(() =>
      expect(api.ajouterAnneeAge).toHaveBeenCalledWith(1, 2016, "test-token"),
    );
    expect(api.updateEdition).not.toHaveBeenCalled();
  });

  it("retire une année au clic sur son bouton ×", async () => {
    (api.retirerAnneeAge as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...EDITION_MOCK,
      anneesAge: [2015],
    });
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: EDITION_MOCK,
      isLoading: false,
    });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Retirer l'année 2014" }));

    await waitFor(() =>
      expect(api.retirerAnneeAge).toHaveBeenCalledWith(1, 2014, "test-token"),
    );
  });
});

describe("ParametresInscriptionPage — switch « Inscriptions ouvertes / fermées »", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEditionEnPreparation.mockReturnValue({ data: null });
  });

  function givenEdition(etape: Edition["etape"], id = 1) {
    mockUseInscriptionSession.mockReturnValue({
      role: "ORGANISATEUR",
      token: "test-token",
      edition: { ...EDITION_MOCK, id, etape },
      isLoading: false,
    });
  }

  it("affiche le switch en tête de page, avant le formulaire", () => {
    givenEdition("CREEE");
    renderPage();

    const toggle = screen.getByRole("switch");
    const form = screen.getByLabelText("Nom du tournoi");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(
      toggle.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getAllByRole("switch")).toHaveLength(1);
  });

  it("reflète l'état serveur de l'édition (INSCRIPTIONS_OUVERTES → ouvert)", () => {
    givenEdition("INSCRIPTIONS_OUVERTES");
    renderPage();

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Inscriptions ouvertes")).toBeInTheDocument();
  });

  it("cible l'édition en préparation (id 2) plutôt que l'édition active pour ouvrir", async () => {
    givenEdition("TOURNOI_DEMARRE", 1);
    mockUseEditionEnPreparation.mockReturnValue({
      data: { ...EDITION_MOCK, id: 2, etape: "CREATION_NOUVEAU_TOURNOI" },
    });
    (api.ouvrirInscriptions as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...EDITION_MOCK,
      id: 2,
      etape: "INSCRIPTIONS_OUVERTES",
    });
    renderPage();

    const toggle = screen.getByRole("switch");
    expect(toggle).not.toHaveAttribute("aria-disabled", "true");
    fireEvent.click(toggle);

    await waitFor(() =>
      expect(api.ouvrirInscriptions).toHaveBeenCalledWith(2, "test-token"),
    );
  });

  it("est désactivé à TOURNOI_DEMARRE : aucun appel possible", () => {
    givenEdition("TOURNOI_DEMARRE");
    renderPage();

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(toggle);
    expect(api.ouvrirInscriptions).not.toHaveBeenCalled();
    expect(api.cloturerInscriptions).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Le tournoi a démarré, les inscriptions ne peuvent plus être rouvertes",
      ),
    ).toBeInTheDocument();
  });
});
