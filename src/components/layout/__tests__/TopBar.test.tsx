import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import TopBar from "../TopBar";
import type { EditionEtape, ProfilRole } from "../../../api/types/inscription.types";

type SelectedTeam = { id: string; name: string; logoUrl?: string; muted?: boolean };

let mockSelectedTeam: SelectedTeam | null = null;
const mockSetSelectedTeam = vi.fn();
const mockToggleMuted = vi.fn();
const mockNavigate = vi.fn();

const mockTeams = [
  { id: "rennes", name: "Rennes", logoUrl: "logo-rennes" },
  { id: "paris", name: "Paris", logoUrl: "logo-paris" },
];

vi.mock("../../../providers/SelectedTeamProvider", () => ({
  useSelectedTeam: () => ({
    selectedTeam: mockSelectedTeam,
    setSelectedTeam: mockSetSelectedTeam,
    toggleMuted: mockToggleMuted,
  }),
}));

// TopBar appelle désormais useInscriptionSession() (ajouté lors de la feature
// rôle TABLE_DE_MARQUE + menus dynamiques). On le mocke ici car les tests
// TopBar ne couvrent que le sélecteur d'équipe, pas les menus d'inscription.
// mockEtape par défaut = 'CLOTUREE' (tournoi construit) pour préserver le
// comportement des tests existants du sélecteur, qui ne portent pas sur le
// masquage par étape (voir describe dédié plus bas).
let mockEtape: EditionEtape | null = "CLOTUREE";
let mockRole: ProfilRole | null = null;
vi.mock("../../../hooks/useInscriptionSession", () => ({
  useInscriptionSession: () => ({
    role: mockRole,
    etape: mockEtape,
    hasDossierAccess: false,
    isLoading: false,
  }),
}));

// TopBar rend désormais <AuthButton /> (feature "Connexion transverse"), qui
// appelle useAuth() directement — mocké ici pour ne pas exiger AuthProvider
// dans un test qui ne couvre que le sélecteur d'équipe.
let mockAuthUser: { uid: string; email?: string; displayName?: string } | null = null;
vi.mock("../../../auth/AuthContext", () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

vi.mock("../../../hooks/useTeams", () => ({
  useTeams: () => ({ data: mockTeams, isLoading: false, isError: false }),
}));

vi.mock("react-router-dom", async (orig) => {
  const mod = await orig();
  return {
    ...(mod as any),
    useNavigate: () => mockNavigate,
  };
});

function renderTopBar() {
  return render(
    <MemoryRouter>
      <TopBar />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockSelectedTeam = null;
  mockAuthUser = null;
  mockEtape = "CLOTUREE";
  mockRole = null;
  mockSetSelectedTeam.mockClear();
  mockToggleMuted.mockClear();
  mockNavigate.mockClear();
});

describe("TopBar — sélecteur d'équipe", () => {
  it("affiche le bouton texte « Suivre une équipe » sans logo quand aucune équipe n'est sélectionnée", () => {
    renderTopBar();

    const btn = screen.getByRole("button", { name: "Suivre une équipe" });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe("BUTTON");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(btn).toHaveAttribute("title", "Suivre une équipe");
  });

  it("ouvre le sélecteur d'équipe au clic sur « Suivre une équipe »", () => {
    renderTopBar();

    fireEvent.click(screen.getByRole("button", { name: "Suivre une équipe" }));

    expect(screen.getByText("Quelle équipe suivre ?")).toBeInTheDocument();
  });

  it("affiche le logo de l'équipe et masque la mention « Suivre une équipe » quand une équipe est sélectionnée", () => {
    mockSelectedTeam = { id: "rennes", name: "Rennes", logoUrl: "logo-rennes" };
    renderTopBar();

    expect(screen.queryByText("Suivre une équipe")).not.toBeInTheDocument();
    const img = screen.getByRole("img", { name: "Rennes" });
    expect(img).toHaveAttribute("src", "logo-rennes");
    expect(screen.getByTitle("Ne plus suivre : Rennes")).toBeInTheDocument();
  });

  it("affiche les initiales quand l'équipe sélectionnée n'a pas de logo", () => {
    mockSelectedTeam = { id: "paris", name: "Paris" };
    renderTopBar();

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("PA")).toBeInTheDocument();
  });

  it("annule la sélection (et le filtre) au clic sur le logo de l'équipe sélectionnée", () => {
    mockSelectedTeam = { id: "rennes", name: "Rennes", logoUrl: "logo-rennes" };
    renderTopBar();

    fireEvent.click(screen.getByTitle("Ne plus suivre : Rennes"));

    expect(mockSetSelectedTeam).toHaveBeenCalledWith(null);
  });

  it("conserve le toggle muted au double-clic sur le logo de l'équipe sélectionnée", () => {
    mockSelectedTeam = { id: "rennes", name: "Rennes", logoUrl: "logo-rennes" };
    renderTopBar();

    fireEvent.doubleClick(screen.getByTitle("Ne plus suivre : Rennes"));

    expect(mockToggleMuted).toHaveBeenCalledTimes(1);
    expect(mockSetSelectedTeam).not.toHaveBeenCalled();
  });

  it("applique le filtre grayscale sur le logo quand l'équipe est en mode muted", () => {
    mockSelectedTeam = { id: "rennes", name: "Rennes", logoUrl: "logo-rennes", muted: true };
    renderTopBar();

    const img = screen.getByRole("img", { name: "Rennes" });
    expect(img.className).toContain("grayscale");
  });
});

describe("TopBar — masquage du bouton Suivre une équipe avant clôture", () => {
  it("masque le bouton quand la session n'est pas résolue (etape = null)", () => {
    mockEtape = null;
    renderTopBar();

    expect(screen.queryByRole("button", { name: "Suivre une équipe" })).not.toBeInTheDocument();
  });

  it("masque le bouton quand etape = CREEE", () => {
    mockEtape = "CREEE";
    renderTopBar();

    expect(screen.queryByRole("button", { name: "Suivre une équipe" })).not.toBeInTheDocument();
  });

  it("masque le bouton quand etape = INSCRIPTIONS_OUVERTES, y compris pour l'ORGANISATEUR", () => {
    mockEtape = "INSCRIPTIONS_OUVERTES";
    mockRole = "ORGANISATEUR";
    renderTopBar();

    expect(screen.queryByRole("button", { name: "Suivre une équipe" })).not.toBeInTheDocument();
  });

  it("affiche le bouton quand etape = CLOTUREE", () => {
    mockEtape = "CLOTUREE";
    renderTopBar();

    expect(screen.getByRole("button", { name: "Suivre une équipe" })).toBeInTheDocument();
  });

  it("affiche le bouton quand etape = TOURNOI_DEMARRE", () => {
    mockEtape = "TOURNOI_DEMARRE";
    renderTopBar();

    expect(screen.getByRole("button", { name: "Suivre une équipe" })).toBeInTheDocument();
  });

  it("ne laisse pas le dropdown ouvert résiduel s'afficher quand etape bascule vers un état masqué", () => {
    mockEtape = "CLOTUREE";
    const { rerender } = renderTopBar();

    fireEvent.click(screen.getByRole("button", { name: "Suivre une équipe" }));
    expect(screen.getByText("Quelle équipe suivre ?")).toBeInTheDocument();

    mockEtape = "INSCRIPTIONS_OUVERTES";
    rerender(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Quelle équipe suivre ?")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Suivre une équipe" })).not.toBeInTheDocument();
  });
});

describe("TopBar — bouton de connexion (AuthButton)", () => {
  it("affiche le bouton « Se connecter » quand aucun utilisateur n'est authentifié", () => {
    renderTopBar();

    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
  });

  it("affiche le bouton « Accéder à mon profil » quand un utilisateur est authentifié", () => {
    mockAuthUser = { uid: "u1", displayName: "Wayne Gretzky" };
    renderTopBar();

    expect(
      screen.getByRole("button", { name: "Accéder à mon profil" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Se connecter" })).not.toBeInTheDocument();
  });
});
