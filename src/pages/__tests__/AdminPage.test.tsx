import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AdminPage from "../AdminPage";

const mockNavigate = vi.fn();
const mockDemarrerTournoi = vi.fn();
const mockUpdateEditionEtape = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockFetchEquipesToutes = vi.fn();
const mockActiverEquipe = vi.fn();
const mockDesactiverEquipe = vi.fn();

let mockSession: {
  role: string | null;
  edition: { id: number } | null;
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
  demarrerTournoi: (...args: unknown[]) => mockDemarrerTournoi(...args),
  updateEditionEtape: (...args: unknown[]) => mockUpdateEditionEtape(...args),
  fetchEquipesReferentielToutes: (...args: unknown[]) => mockFetchEquipesToutes(...args),
  activerEquipeReferentiel: (...args: unknown[]) => mockActiverEquipe(...args),
  desactiverEquipeReferentiel: (...args: unknown[]) => mockDesactiverEquipe(...args),
}));

// NouvelleSaisonPanel a sa propre suite de tests dédiée
// (components/admin/__tests__/NouvelleSaisonPanel.test.tsx) : ici on vérifie
// uniquement le câblage (rendu conditionnel + props transmises).
vi.mock("../../components/admin/NouvelleSaisonPanel", () => ({
  default: (props: { token: string; editionActiveId: number }) => (
    <div
      data-testid="nouvelle-saison-panel"
      data-token={props.token}
      data-edition-active-id={props.editionActiveId}
    />
  ),
}));

vi.mock("@tanstack/react-query", async (orig) => {
  const mod = await orig<typeof import("@tanstack/react-query")>();
  return {
    ...mod,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  };
});

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

beforeEach(() => {
  mockNavigate.mockClear();
  mockDemarrerTournoi.mockClear();
  mockUpdateEditionEtape.mockClear();
  mockInvalidateQueries.mockClear();
  mockFetchEquipesToutes.mockReset().mockResolvedValue([]);
  mockActiverEquipe.mockReset().mockResolvedValue({ id: 1, nom: "Les Sharks", active: true });
  mockDesactiverEquipe.mockReset().mockResolvedValue({ id: 1, nom: "Les Sharks", active: false });
  mockSession = {
    role: "ORGANISATEUR",
    edition: { id: 1 },
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

describe("AdminPage — frise du cycle des phases", () => {
  it("affiche la frise avec la phase courante en clair", () => {
    mockSession.etape = "CLOTUREE";
    renderPage();

    expect(screen.getByText("Clôturée")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });
});

describe("AdminPage — liens", () => {
  it("expose les liens vers les pages admin existantes", () => {
    renderPage();

    // Paramètres sportifs : repurposé en consultation lecture seule de l'édition démarrée
    // (cf. docs/specs — le lien "Paramètres sportifs" de NouvelleSaisonPanel, lui, continue
    // de cibler /admin/parametres-sportifs sans paramètre, pour l'édition en préparation).
    expect(screen.getByRole("link", { name: "Paramètres sportifs" })).toHaveAttribute(
      "href",
      "/admin/parametres-sportifs?edition=demarree",
    );
    expect(screen.getByRole("link", { name: "Paramètres d'inscription" })).toHaveAttribute(
      "href",
      "/admin/parametres-inscription",
    );
    expect(screen.getByRole("link", { name: "Simulation de planning" })).toHaveAttribute(
      "href",
      "/admin/planning/simulation",
    );
  });

  it("affiche Paramètres d'inscription avant Paramètres sportifs, puis Simulation de planning et Présentation du tournoi", () => {
    renderPage();

    const liens = screen.getAllByRole("link").map((lien) => lien.getAttribute("href"));

    expect(liens).toEqual([
      "/admin/parametres-inscription",
      "/admin/parametres-sportifs?edition=demarree",
      "/admin/planning/simulation",
      "/admin/presentation-tournoi",
    ]);
  });

  it("désactive Paramètres d'inscription (pur doublon) quand une édition en préparation existe", () => {
    mockUseEditionEnPreparation.mockReturnValue({ data: { id: 2, etape: "CREATION_NOUVEAU_TOURNOI" } });
    renderPage();

    expect(screen.queryByRole("link", { name: "Paramètres d'inscription" })).not.toBeInTheDocument();
    const desactive = screen.getByText("Paramètres d'inscription");
    expect(desactive.tagName).toBe("SPAN");
    expect(desactive).toHaveAttribute("aria-disabled", "true");
    // Paramètres sportifs reste cliquable — repurposé, pas désactivé
    expect(screen.getByRole("link", { name: "Paramètres sportifs" })).toHaveAttribute(
      "href",
      "/admin/parametres-sportifs?edition=demarree",
    );
  });
});

describe("AdminPage — action Lancer le tournoi", () => {
  it("affiche le bouton uniquement quand etape === CLOTUREE", () => {
    mockSession.etape = "CLOTUREE";
    renderPage();

    expect(screen.getByRole("button", { name: "Lancer le tournoi" })).toBeInTheDocument();
  });

  it("masque le bouton en dehors de CLOTUREE (ex. INSCRIPTIONS_OUVERTES)", () => {
    mockSession.etape = "INSCRIPTIONS_OUVERTES";
    renderPage();

    expect(screen.queryByRole("button", { name: "Lancer le tournoi" })).not.toBeInTheDocument();
  });

  it("masque le bouton une fois TOURNOI_DEMARRE atteint", () => {
    mockSession.etape = "TOURNOI_DEMARRE";
    renderPage();

    expect(screen.queryByRole("button", { name: "Lancer le tournoi" })).not.toBeInTheDocument();
  });

  it("ouvre une modale de confirmation avant tout appel à demarrerTournoi", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Lancer le tournoi" }));

    expect(screen.getByText("Lancer le tournoi ?")).toBeInTheDocument();
    expect(mockDemarrerTournoi).not.toHaveBeenCalled();
  });

  it("annule sans appeler demarrerTournoi", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Lancer le tournoi" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByText("Lancer le tournoi ?")).not.toBeInTheDocument();
    expect(mockDemarrerTournoi).not.toHaveBeenCalled();
  });

  it("confirme : appelle demarrerTournoi(editionId, token) et invalide le cache édition", async () => {
    mockDemarrerTournoi.mockResolvedValue({ id: 1, etape: "TOURNOI_DEMARRE" });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Lancer le tournoi" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() => {
      expect(mockDemarrerTournoi).toHaveBeenCalledWith(1, "fake-token");
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["inscription", "edition-courante"],
    });
    await waitFor(() => {
      expect(screen.queryByText("Lancer le tournoi ?")).not.toBeInTheDocument();
    });
  });

  it("affiche un message d'erreur quand demarrerTournoi échoue, et garde la modale ouverte", async () => {
    mockDemarrerTournoi.mockRejectedValue(new Error("400"));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Lancer le tournoi" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() => {
      expect(screen.getByText("Impossible de démarrer le tournoi.")).toBeInTheDocument();
    });
  });
});

describe("AdminPage — action Ouvrir les inscriptions (CREEE)", () => {
  it("affiche le bouton uniquement quand etape === CREEE", () => {
    mockSession.etape = "CREEE";
    renderPage();

    expect(screen.getByRole("button", { name: "Ouvrir les inscriptions" })).toBeInTheDocument();
  });

  it("masque le bouton en dehors de CREEE", () => {
    mockSession.etape = "INSCRIPTIONS_OUVERTES";
    renderPage();

    expect(screen.queryByRole("button", { name: "Ouvrir les inscriptions" })).not.toBeInTheDocument();
  });

  it("appelle updateEditionEtape(editionId, 'INSCRIPTIONS_OUVERTES', token) directement, sans modale", async () => {
    mockSession.etape = "CREEE";
    mockUpdateEditionEtape.mockResolvedValue({ id: 1, etape: "INSCRIPTIONS_OUVERTES" });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Ouvrir les inscriptions" }));

    await waitFor(() => {
      expect(mockUpdateEditionEtape).toHaveBeenCalledWith(1, "INSCRIPTIONS_OUVERTES", "fake-token");
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["inscription", "edition-courante"],
    });
  });

  it("affiche un message d'erreur quand l'ouverture échoue", async () => {
    mockSession.etape = "CREEE";
    mockUpdateEditionEtape.mockRejectedValue(new Error("400"));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Ouvrir les inscriptions" }));

    await waitFor(() => {
      expect(screen.getByText("Impossible d'ouvrir les inscriptions.")).toBeInTheDocument();
    });
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

describe("AdminPage — action Clôturer les inscriptions (INSCRIPTIONS_OUVERTES)", () => {
  it("affiche le bouton uniquement quand etape === INSCRIPTIONS_OUVERTES", () => {
    mockSession.etape = "INSCRIPTIONS_OUVERTES";
    renderPage();

    expect(screen.getByRole("button", { name: "Clôturer les inscriptions" })).toBeInTheDocument();
  });

  it("masque le bouton en dehors de INSCRIPTIONS_OUVERTES", () => {
    mockSession.etape = "CLOTUREE";
    renderPage();

    expect(screen.queryByRole("button", { name: "Clôturer les inscriptions" })).not.toBeInTheDocument();
  });

  it("ouvre une modale de confirmation avant tout appel à updateEditionEtape", () => {
    mockSession.etape = "INSCRIPTIONS_OUVERTES";
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Clôturer les inscriptions" }));

    expect(screen.getByText("Clôturer les inscriptions ?")).toBeInTheDocument();
    expect(mockUpdateEditionEtape).not.toHaveBeenCalled();
  });

  it("confirme : appelle updateEditionEtape(editionId, 'CLOTUREE', token) et invalide le cache édition", async () => {
    mockSession.etape = "INSCRIPTIONS_OUVERTES";
    mockUpdateEditionEtape.mockResolvedValue({ id: 1, etape: "CLOTUREE" });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Clôturer les inscriptions" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() => {
      expect(mockUpdateEditionEtape).toHaveBeenCalledWith(1, "CLOTUREE", "fake-token");
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["inscription", "edition-courante"],
    });
    await waitFor(() => {
      expect(screen.queryByText("Clôturer les inscriptions ?")).not.toBeInTheDocument();
    });
  });
});

describe("AdminPage — cycle annuel de l'édition (NouvelleSaisonPanel, spec §5)", () => {
  it("affiche NouvelleSaisonPanel avec editionActiveId + token quand etape === TOURNOI_DEMARRE", () => {
    mockSession.etape = "TOURNOI_DEMARRE";
    mockSession.edition = { id: 1 };
    renderPage();

    const panel = screen.getByTestId("nouvelle-saison-panel");
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute("data-token", "fake-token");
    expect(panel).toHaveAttribute("data-edition-active-id", "1");
  });

  it.each(["CREEE", "INSCRIPTIONS_OUVERTES", "CLOTUREE"])(
    "masque NouvelleSaisonPanel en dehors de TOURNOI_DEMARRE (etape=%s)",
    (etape) => {
      mockSession.etape = etape;
      renderPage();

      expect(screen.queryByTestId("nouvelle-saison-panel")).not.toBeInTheDocument();
    },
  );
});
