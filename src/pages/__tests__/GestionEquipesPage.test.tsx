import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import GestionEquipesPage from "../GestionEquipesPage";

// docs/specs/recommandations-finales-contexte-la-mise-en-place-de-la-colo.md — §1, CA1

const mockFetchToutes = vi.fn();
const mockNavigate = vi.fn();

let mockRole: string | null;
let mockIsLoading: boolean;
let mockToken: string | null;

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ token: mockToken }),
}));

vi.mock("../../hooks/useInscriptionSession", () => ({
  useInscriptionSession: () => ({
    role: mockRole,
    edition: null,
    etape: null,
    isLoading: mockIsLoading,
  }),
}));

vi.mock("../../api/inscription", () => ({
  fetchEquipesReferentielToutes: (...args: unknown[]) => mockFetchToutes(...args),
  modifierEquipeReferentiel: vi.fn(),
  activerEquipeReferentiel: vi.fn(),
  desactiverEquipeReferentiel: vi.fn(),
  createEquipeDemande: vi.fn(),
}));

vi.mock("react-router-dom", async (orig) => {
  const mod = await orig();
  return { ...(mod as object), useNavigate: () => mockNavigate };
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/admin/equipes"]}>
        <GestionEquipesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRole = "ORGANISATEUR";
  mockIsLoading = false;
  mockToken = "fake-token";
  mockFetchToutes.mockResolvedValue([
    { id: 1, nom: "Courbevoie", nomComplet: "Les Coqs de Courbevoie", active: true },
  ]);
});

describe("GestionEquipesPage — accès (CA1)", () => {
  it("affiche l'écran à l'organisateur : titre, fil d'Ariane et liste", async () => {
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Équipes du référentiel" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Modifier Courbevoie" })).toBeInTheDocument();
    expect(mockFetchToutes).toHaveBeenCalledWith("fake-token");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it.each(["RESPONSABLE_EQUIPE", "TABLE_DE_MARQUE", null])(
    "redirige vers l'accueil et ne charge aucune donnée pour le rôle %s",
    async (role) => {
      mockRole = role;
      const { container } = renderPage();

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true }));
      expect(container).toBeEmptyDOMElement();
      expect(mockFetchToutes).not.toHaveBeenCalled();
    },
  );

  it("ne redirige pas et ne charge rien tant que la session est en cours de chargement", () => {
    mockRole = null;
    mockIsLoading = true;
    const { container } = renderPage();

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
    expect(mockFetchToutes).not.toHaveBeenCalled();
  });

  it("ne charge rien sans jeton, même pour un organisateur", () => {
    mockToken = null;
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Équipes du référentiel" }),
    ).toBeInTheDocument();
    expect(mockFetchToutes).not.toHaveBeenCalled();
  });
});
