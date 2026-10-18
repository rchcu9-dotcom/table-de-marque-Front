import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AdminPage from "../AdminPage";

const mockNavigate = vi.fn();
const mockFetchEquipesToutes = vi.fn();
const mockActiverEquipe = vi.fn();
const mockDesactiverEquipe = vi.fn();

type EditionMock = { id: number; annee: number; etape: string };

let mockSession: {
  role: string | null;
  edition: EditionMock | null;
  etape: string | null;
  isLoading: boolean;
};

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ token: "fake-token" }),
}));

vi.mock("../../hooks/useInscriptionSession", () => ({
  useInscriptionSession: () => mockSession,
  EDITION_QUERY_KEY: ["inscription", "edition-courante"],
}));

const mockUseEditionEnPreparation = vi.fn();
vi.mock("../../hooks/useEditionEnPreparation", () => ({
  useEditionEnPreparation: () => mockUseEditionEnPreparation(),
}));

vi.mock("../../api/inscription", () => ({
  fetchEquipesReferentielToutes: (...args: unknown[]) => mockFetchEquipesToutes(...args),
  activerEquipeReferentiel: (...args: unknown[]) => mockActiverEquipe(...args),
  desactiverEquipeReferentiel: (...args: unknown[]) => mockDesactiverEquipe(...args),
  // Importé par le panneau « Ajouter une équipe au référentiel », couvert dans
  // AdminPage.equipeReferentiel.test.tsx.
  createEquipeDemande: vi.fn(),
}));

// PilotageTournoi a sa propre suite (components/admin/__tests__/PilotageTournoi.test.tsx) :
// ici on vérifie uniquement le câblage (props transmises, position en haut de page).
vi.mock("../../components/admin/PilotageTournoi", () => ({
  default: (props: {
    token: string;
    editionActive: EditionMock | null;
    editionEnPreparation: EditionMock | null;
  }) => (
    <div
      data-testid="pilotage"
      data-token={props.token}
      data-active={props.editionActive?.id ?? ""}
      data-preparation={props.editionEnPreparation?.id ?? ""}
    />
  ),
}));

vi.mock("react-router-dom", async (orig) => {
  const mod = await orig();
  return {
    ...(mod as any),
    useNavigate: () => mockNavigate,
  };
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function givenEtape(etape: string) {
  mockSession.etape = etape;
  mockSession.edition = { id: 1, annee: 2026, etape };
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockFetchEquipesToutes.mockReset().mockResolvedValue([]);
  mockActiverEquipe.mockReset().mockResolvedValue({ id: 1, nom: "Les Sharks", active: true });
  mockDesactiverEquipe.mockReset().mockResolvedValue({ id: 1, nom: "Les Sharks", active: false });
  mockSession = {
    role: "ORGANISATEUR",
    edition: { id: 1, annee: 2026, etape: "CLOTUREE" },
    etape: "CLOTUREE",
    isLoading: false,
  };
  mockUseEditionEnPreparation.mockReturnValue({ data: null });
});

describe("AdminPage — garde de rôle", () => {
  it("redirige vers / quand le rôle n'est pas ORGANISATEUR", () => {
    mockSession = { role: "RESPONSABLE_EQUIPE", edition: null, etape: null, isLoading: false };
    renderPage();

    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("n'affiche rien pendant le chargement de la session, même si le rôle n'est pas encore résolu", () => {
    mockSession = { role: null, edition: null, etape: null, isLoading: true };
    renderPage();

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByText("Administration")).not.toBeInTheDocument();
  });

  it("affiche la page pour un ORGANISATEUR", () => {
    renderPage();

    expect(screen.getByText("Administration")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("AdminPage — bloc Pilotage du tournoi", () => {
  it("place le bloc Pilotage en haut, avant la section Outils", () => {
    renderPage();

    const pilotage = screen.getByTestId("pilotage");
    const outils = screen.getByRole("heading", { name: "Outils" });
    expect(pilotage.compareDocumentPosition(outils) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("transmet le jeton, l'édition active et l'édition en préparation", () => {
    mockUseEditionEnPreparation.mockReturnValue({
      data: { id: 2, annee: 2027, etape: "CREATION_NOUVEAU_TOURNOI" },
    });
    renderPage();

    const pilotage = screen.getByTestId("pilotage");
    expect(pilotage).toHaveAttribute("data-token", "fake-token");
    expect(pilotage).toHaveAttribute("data-active", "1");
    expect(pilotage).toHaveAttribute("data-preparation", "2");
  });

  it("n'affiche plus le code technique de l'étape ni le lien « Gérer dans Paramètres d'inscription »", () => {
    renderPage();

    expect(screen.queryByText(/CLOTUREE/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Phase de l'édition/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Gérer dans Paramètres d'inscription" }),
    ).not.toBeInTheDocument();
  });
});

describe("AdminPage — section Outils", () => {
  it("liste les outils dans l'ordre, tous actifs (jamais désactivés)", () => {
    mockUseEditionEnPreparation.mockReturnValue({
      data: { id: 2, annee: 2027, etape: "CREATION_NOUVEAU_TOURNOI" },
    });
    renderPage();

    const liens = screen.getAllByRole("link").map((l) => l.textContent);
    expect(liens).toEqual([
      "Paramètres d'inscription",
      "Paramètres sportifs",
      "Simulation de planning",
      "Présentation du tournoi",
      "Équipes du référentiel",
    ].map((label, i) => (i === 0 ? `${label}Utile maintenant` : label)));
  });

  it.each([
    ["CREEE", "Paramètres d'inscription"],
    ["INSCRIPTIONS_OUVERTES", "Paramètres sportifs"],
    ["CLOTUREE", "Simulation de planning"],
    ["TOURNOI_DEMARRE", "Présentation du tournoi"],
  ])("met en avant l'outil utile à l'étape %s : %s", (etape, outil) => {
    givenEtape(etape);
    renderPage();

    expect(screen.getAllByText("Utile maintenant")).toHaveLength(1);
    expect(screen.getByRole("link", { name: new RegExp(`^${outil}`) })).toHaveTextContent(
      "Utile maintenant",
    );
  });

  it("met en avant l'outil de l'édition en préparation, pas celui de l'édition en cours", () => {
    givenEtape("TOURNOI_DEMARRE");
    mockUseEditionEnPreparation.mockReturnValue({
      data: { id: 2, annee: 2027, etape: "CREATION_NOUVEAU_TOURNOI" },
    });
    renderPage();

    expect(screen.getByRole("link", { name: /^Paramètres d'inscription/ })).toHaveTextContent(
      "Utile maintenant",
    );
  });

  // docs/specs/recommandations-finales-contexte-la-mise-en-place-de-la-colo.md — §1, CA1
  it.each(["CREEE", "INSCRIPTIONS_OUVERTES", "CLOTUREE", "TOURNOI_DEMARRE"])(
    "Équipes du référentiel : lien vers /admin/equipes, jamais « Utile maintenant » (étape %s)",
    (etape) => {
      givenEtape(etape);
      renderPage();

      const lien = screen.getByRole("link", { name: "Équipes du référentiel" });
      expect(lien).toHaveAttribute("href", "/admin/equipes");
      expect(lien).not.toHaveTextContent("Utile maintenant");
    },
  );

  it("Paramètres sportifs : consultation de l'édition démarrée quand c'est elle qui est pilotée", () => {
    givenEtape("TOURNOI_DEMARRE");
    renderPage();

    expect(screen.getByRole("link", { name: /^Paramètres sportifs/ })).toHaveAttribute(
      "href",
      "/admin/parametres-sportifs?edition=demarree",
    );
  });

  it("Paramètres sportifs : édition modifiable avant le lancement ou en préparation", () => {
    givenEtape("CREEE");
    renderPage();

    expect(screen.getByRole("link", { name: /^Paramètres sportifs/ })).toHaveAttribute(
      "href",
      "/admin/parametres-sportifs",
    );
  });
});

describe("AdminPage — équipes désactivées (modération a posteriori)", () => {
  it("n'affiche aucune section quand toutes les équipes sont actives", async () => {
    mockFetchEquipesToutes.mockResolvedValue([{ id: 1, nom: "Rennes", active: true }]);
    renderPage();

    await waitFor(() => expect(mockFetchEquipesToutes).toHaveBeenCalledWith("fake-token"));
    expect(screen.queryByText(/Équipes désactivées/)).not.toBeInTheDocument();
  });

  it("liste les équipes inactives avec un bouton Activer", async () => {
    mockFetchEquipesToutes.mockResolvedValue([
      { id: 1, nom: "Rennes", active: true },
      { id: 2, nom: "Les Sharks", active: false },
    ]);
    renderPage();

    expect(await screen.findByText("Équipes désactivées (1)")).toBeInTheDocument();
    expect(screen.getByText("Les Sharks")).toBeInTheDocument();
    expect(screen.queryByText("Rennes")).not.toBeInTheDocument();
  });

  it("appelle activerEquipeReferentiel(id, token) au clic sur Activer", async () => {
    mockFetchEquipesToutes.mockResolvedValue([{ id: 2, nom: "Les Sharks", active: false }]);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Activer" }));

    await waitFor(() => {
      expect(mockActiverEquipe).toHaveBeenCalledWith(2, "fake-token");
    });
  });
});
