import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AdminPage from "../AdminPage";

// docs/specs/-prise-en-compte-du-nom-court-pour-les-logos-contexte-actuel.md — CA4, CA5
// Câblage du panneau « Ajouter une équipe au référentiel » et affichage du nom
// complet dans le panneau des équipes désactivées. Le formulaire lui-même est
// couvert par components/admin/__tests__/AjouterEquipeReferentielPanel.test.tsx.

const mockFetchEquipesToutes = vi.fn();
const mockCreateEquipeDemande = vi.fn();

let mockRole: string | null;

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ token: "fake-token" }),
}));

vi.mock("../../hooks/useInscriptionSession", () => ({
  useInscriptionSession: () => ({
    role: mockRole,
    edition: null,
    etape: null,
    isLoading: false,
  }),
  EDITION_QUERY_KEY: ["inscription", "edition-courante"],
}));

vi.mock("../../hooks/useEditionEnPreparation", () => ({
  useEditionEnPreparation: () => ({ data: null }),
}));

vi.mock("../../api/inscription", () => ({
  fetchEquipesReferentielToutes: (...args: unknown[]) => mockFetchEquipesToutes(...args),
  createEquipeDemande: (...args: unknown[]) => mockCreateEquipeDemande(...args),
  activerEquipeReferentiel: vi.fn(),
  desactiverEquipeReferentiel: vi.fn(),
}));

vi.mock("../../components/admin/PilotageTournoi", () => ({
  default: () => <div data-testid="pilotage" />,
}));

vi.mock("react-router-dom", async (orig) => {
  const mod = await orig();
  return { ...(mod as object), useNavigate: () => vi.fn() };
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
  vi.clearAllMocks();
  mockRole = "ORGANISATEUR";
  mockFetchEquipesToutes.mockResolvedValue([]);
});

describe("AdminPage — ajout d'une équipe au référentiel", () => {
  it("propose le formulaire à l'organisateur, même sans équipe désactivée", async () => {
    renderPage();

    expect(screen.getByText("Ajouter une équipe au référentiel")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom court")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nom complet/)).toBeInTheDocument();
    await waitFor(() => expect(mockFetchEquipesToutes).toHaveBeenCalled());
    expect(screen.queryByText(/Équipes désactivées/)).not.toBeInTheDocument();
  });

  it("n'affiche rien à un utilisateur qui n'est pas organisateur", () => {
    mockRole = "RESPONSABLE_EQUIPE";
    renderPage();

    expect(screen.queryByText("Ajouter une équipe au référentiel")).not.toBeInTheDocument();
  });

  it("crée l'équipe avec ses deux noms puis recharge la liste de l'organisateur", async () => {
    mockCreateEquipeDemande.mockResolvedValue({
      id: 7,
      nom: "Courbevoie",
      nomComplet: "Les Coqs de Courbevoie",
      active: true,
    });
    renderPage();
    await waitFor(() => expect(mockFetchEquipesToutes).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("Nom court"), { target: { value: "Courbevoie" } });
    fireEvent.change(screen.getByLabelText(/Nom complet/), {
      target: { value: "Les Coqs de Courbevoie" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    await waitFor(() =>
      expect(mockCreateEquipeDemande).toHaveBeenCalledWith(
        { nom: "Courbevoie", nomComplet: "Les Coqs de Courbevoie" },
        "fake-token",
      ),
    );
    expect(await screen.findByText("Équipe « Courbevoie » ajoutée.")).toBeInTheDocument();
    await waitFor(() => expect(mockFetchEquipesToutes).toHaveBeenCalledTimes(2));
  });

  it("place le formulaire avant le panneau des équipes désactivées", async () => {
    mockFetchEquipesToutes.mockResolvedValue([{ id: 2, nom: "Les Sharks", active: false }]);
    renderPage();

    const desactivees = await screen.findByText("Équipes désactivées (1)");
    const ajout = screen.getByText("Ajouter une équipe au référentiel");
    expect(
      ajout.compareDocumentPosition(desactivees) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("AdminPage — équipes désactivées : affichage du nom complet (CA4)", () => {
  it("affiche le nom court puis, en dessous et en plus petit, le nom complet", async () => {
    mockFetchEquipesToutes.mockResolvedValue([
      { id: 2, nom: "Courbevoie", nomComplet: "Les Coqs de Courbevoie", active: false },
      { id: 3, nom: "Rennes", nomComplet: null, active: false },
    ]);
    renderPage();

    await screen.findByText("Équipes désactivées (2)");
    const [ligneCourbevoie, ligneRennes] = screen.getAllByRole("listitem");

    const nomCourt = within(ligneCourbevoie).getByText("Courbevoie");
    const nomComplet = within(ligneCourbevoie).getByText("Les Coqs de Courbevoie");
    expect(nomComplet).toHaveClass("text-xs");
    expect(nomCourt).not.toHaveClass("text-xs");
    expect(
      nomCourt.compareDocumentPosition(nomComplet) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(ligneCourbevoie).getByRole("button", { name: "Activer" })).toBeInTheDocument();

    // Sans nom complet : une seule ligne de texte, pas d'espace vide.
    expect(within(ligneRennes).getByText("Rennes").parentElement!.children).toHaveLength(1);
  });
});
