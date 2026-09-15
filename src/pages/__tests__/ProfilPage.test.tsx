import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ProfilPage from "../ProfilPage";

type MockUser = { uid: string; email?: string; displayName?: string } | null;

let mockUser: MockUser = { uid: "u1", email: "wayne@example.com", displayName: "Wayne Gretzky" };
let mockRole: string | null = "RESPONSABLE_EQUIPE";
const mockLogout = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout }),
}));

vi.mock("../../hooks/useInscriptionSession", () => ({
  useInscriptionSession: () => ({ role: mockRole }),
}));

vi.mock("react-router-dom", async (orig) => {
  const mod = await orig();
  return {
    ...(mod as any),
    useNavigate: () => mockNavigate,
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUser = { uid: "u1", email: "wayne@example.com", displayName: "Wayne Gretzky" };
  mockRole = "RESPONSABLE_EQUIPE";
  mockLogout.mockClear();
  mockNavigate.mockClear();
});

describe("ProfilPage — identité", () => {
  it("affiche le displayName, l'email et le rôle", () => {
    renderPage();

    expect(screen.getByText("Wayne Gretzky")).toBeInTheDocument();
    expect(screen.getByText("wayne@example.com")).toBeInTheDocument();
    expect(screen.getByText("RESPONSABLE_EQUIPE")).toBeInTheDocument();
  });

  it("redirige vers /connexion quand aucun utilisateur n'est authentifié", () => {
    mockUser = null;
    renderPage();

    expect(mockNavigate).toHaveBeenCalledWith("/connexion", { replace: true });
  });
});

describe("ProfilPage — lien admin", () => {
  it("n'affiche pas le lien Administration pour un RESPONSABLE_EQUIPE", () => {
    mockRole = "RESPONSABLE_EQUIPE";
    renderPage();

    expect(screen.queryByRole("link", { name: "Administration" })).not.toBeInTheDocument();
  });

  it("affiche le lien Administration pour un ORGANISATEUR, pointant vers /admin", () => {
    mockRole = "ORGANISATEUR";
    renderPage();

    const link = screen.getByRole("link", { name: "Administration" });
    expect(link).toHaveAttribute("href", "/admin");
  });
});

describe("ProfilPage — déconnexion", () => {
  it("appelle logout() puis navigue vers / au clic sur Se déconnecter", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
