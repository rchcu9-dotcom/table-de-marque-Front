import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import type { EditionEtape } from "../../api/types/inscription.types";

let mockEtape: EditionEtape | null = null;
let mockEnAttente = false;

vi.mock("../../hooks/useInscriptionSession", () => ({
  useInscriptionSession: () => ({
    edition: null,
    etape: mockEtape,
    etapeAccueil: mockEtape,
    etapeAccueilEnAttente: mockEnAttente,
    profil: null,
    role: null,
    hasDossierAccess: false,
    token: null,
    isLoading: false,
  }),
}));

vi.mock("../../components/layout/LayoutRoot", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout-root">{children}</div>,
}));

vi.mock("../../pages/HomePage", () => ({
  default: () => <div data-testid="stub-home-page" />,
}));

vi.mock("../../pages/PresentationTournoiPage", () => ({
  default: () => <div data-testid="stub-presentation-page" />,
}));

vi.mock("../../pages/TournoiInfosPage", () => ({
  default: () => <div data-testid="stub-tournoi-infos-page" />,
}));

// Le premier import du routeur charge toutes les pages : sous la charge de la suite complète, il
// dépassait le délai de 5 s du premier test. On le paie une fois ici, avec un délai adapté.
beforeAll(async () => {
  await import("../index");
}, 30_000);

async function renderRouterAt(path: string) {
  const { default: AppRouter } = await import("../index");
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
  );
}

describe("AppRouter — route '/' conditionnelle par phase d'édition", () => {
  beforeEach(() => {
    mockEnAttente = false;
  });

  it("affiche PresentationTournoiPage quand l'étape est INSCRIPTIONS_OUVERTES", async () => {
    mockEtape = "INSCRIPTIONS_OUVERTES";

    await renderRouterAt("/");

    expect(screen.getByTestId("stub-presentation-page")).toBeInTheDocument();
    expect(screen.queryByTestId("stub-home-page")).not.toBeInTheDocument();
  });

  it("affiche HomePage quand l'étape n'est pas INSCRIPTIONS_OUVERTES (ex: CLOTUREE)", async () => {
    mockEtape = "CLOTUREE";

    await renderRouterAt("/");

    expect(screen.getByTestId("stub-home-page")).toBeInTheDocument();
    expect(screen.queryByTestId("stub-presentation-page")).not.toBeInTheDocument();
  });

  it("affiche HomePage quand l'étape est TOURNOI_DEMARRE", async () => {
    mockEtape = "TOURNOI_DEMARRE";

    await renderRouterAt("/");

    expect(screen.getByTestId("stub-home-page")).toBeInTheDocument();
  });

  it.each<EditionEtape>(["CREEE", "CREATION_NOUVEAU_TOURNOI"])(
    "affiche HomePage pendant la préparation de la saison suivante (%s)",
    async (etape) => {
      mockEtape = etape;

      await renderRouterAt("/");

      expect(screen.getByTestId("stub-home-page")).toBeInTheDocument();
    },
  );

  it("n'affiche aucun des deux accueils tant que l'étape est en attente", async () => {
    mockEtape = null;
    mockEnAttente = true;

    await renderRouterAt("/");

    expect(screen.getByTestId("accueil-chargement")).toBeInTheDocument();
    expect(screen.queryByTestId("stub-home-page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stub-presentation-page")).not.toBeInTheDocument();
  });

  it("affiche HomePage quand il n'y a aucune édition courante ou que le chargement a échoué", async () => {
    mockEtape = null;
    mockEnAttente = false;

    await renderRouterAt("/");

    expect(screen.getByTestId("stub-home-page")).toBeInTheDocument();
  });
});

describe("AppRouter — route publique /tournoi/infos (CA7)", () => {
  const ETAPES: Array<EditionEtape | null> = [
    "CREEE",
    "CREATION_NOUVEAU_TOURNOI",
    "INSCRIPTIONS_OUVERTES",
    "CLOTUREE",
    "TOURNOI_DEMARRE",
    null,
  ];

  it.each(ETAPES)("affiche la page récapitulative dans LayoutRoot quelle que soit l'étape (%s)", async (etape) => {
    mockEtape = etape;

    await renderRouterAt("/tournoi/infos");

    expect(screen.getByTestId("layout-root")).toContainElement(screen.getByTestId("stub-tournoi-infos-page"));
    expect(screen.queryByTestId("stub-home-page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stub-presentation-page")).not.toBeInTheDocument();
  });

  it("conserve les paramètres de requête (?lang=en)", async () => {
    mockEtape = "TOURNOI_DEMARRE";

    await renderRouterAt("/tournoi/infos?lang=en");

    expect(screen.getByTestId("stub-tournoi-infos-page")).toBeInTheDocument();
  });
});
