import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import AuthButton from "../AuthButton";

type MockUser = { uid: string; email?: string; displayName?: string } | null;

let mockUser: MockUser = null;
const mockNavigate = vi.fn();
const mockRememberCurrentPath = vi.fn();

vi.mock("../../../auth/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../auth/postLoginRedirect", () => ({
  rememberCurrentPath: () => mockRememberCurrentPath(),
}));

vi.mock("react-router-dom", async (orig) => {
  const mod = await orig();
  return {
    ...(mod as any),
    useNavigate: () => mockNavigate,
  };
});

function renderAuthButton() {
  return render(
    <MemoryRouter>
      <AuthButton />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUser = null;
  mockNavigate.mockClear();
  mockRememberCurrentPath.mockClear();
});

describe("AuthButton — déconnecté", () => {
  it("affiche le silhouette de connexion", () => {
    renderAuthButton();

    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
  });

  it("mémorise le chemin courant puis navigue vers /connexion au clic", () => {
    renderAuthButton();

    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(mockRememberCurrentPath).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/connexion");
  });
});

describe("AuthButton — connecté", () => {
  it("affiche les initiales du displayName", () => {
    mockUser = { uid: "u1", displayName: "Wayne Gretzky" };
    renderAuthButton();

    expect(screen.getByText("WG")).toBeInTheDocument();
  });

  it("affiche une icône générique quand displayName est absent", () => {
    mockUser = { uid: "u1", email: "wayne@example.com" };
    renderAuthButton();

    expect(screen.queryByText(/\w{2}/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accéder à mon profil" })).toBeInTheDocument();
  });

  it("navigue vers /profil au clic, sans mémoriser le chemin courant", () => {
    mockUser = { uid: "u1", displayName: "Wayne Gretzky" };
    renderAuthButton();

    fireEvent.click(screen.getByRole("button", { name: "Accéder à mon profil" }));

    expect(mockNavigate).toHaveBeenCalledWith("/profil");
    expect(mockRememberCurrentPath).not.toHaveBeenCalled();
  });
});
