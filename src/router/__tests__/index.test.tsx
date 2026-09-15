import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import type { EditionEtape } from "../../api/types/inscription.types";

let mockEtape: EditionEtape | null = null;

vi.mock("../../hooks/useInscriptionSession", () => ({
  useInscriptionSession: () => ({
    edition: null,
    etape: mockEtape,
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

async function renderRouterAt(path: string) {
  const { default: AppRouter } = await import("../index");
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
  );
}

describe("AppRouter — route '/' conditionnelle par phase d'édition", () => {
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

  it("affiche HomePage par défaut quand l'étape est encore inconnue (null)", async () => {
    mockEtape = null;

    await renderRouterAt("/");

    expect(screen.getByTestId("stub-home-page")).toBeInTheDocument();
  });
});
