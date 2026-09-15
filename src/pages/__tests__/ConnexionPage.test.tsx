import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ConnexionPage from "../ConnexionPage";

const mockNavigate = vi.fn();
const mockSetAuthToken = vi.fn();
const mockDevLogin = vi.fn();
const mockConsumeRedirectPath = vi.fn();

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    googleLoginUrl: "http://localhost:3000/auth/google",
    setAuthToken: mockSetAuthToken,
  }),
}));

vi.mock("../../auth/postLoginRedirect", () => ({
  consumeRedirectPath: (fallback: string) => mockConsumeRedirectPath(fallback),
}));

vi.mock("../../api/auth", () => ({
  devLogin: (...args: unknown[]) => mockDevLogin(...args),
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
      <ConnexionPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockSetAuthToken.mockClear();
  mockDevLogin.mockClear();
  mockConsumeRedirectPath.mockReturnValue("/inscription");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ConnexionPage — bloc Google", () => {
  it("affiche un lien « Se connecter avec Google » pointant vers googleLoginUrl", () => {
    renderPage();

    const link = screen.getByRole("link", { name: /Se connecter avec Google/ });
    expect(link).toHaveAttribute("href", "http://localhost:3000/auth/google");
  });
});

describe("ConnexionPage — dev-login masqué en production", () => {
  it("n'affiche pas le formulaire dev-login quand import.meta.env.DEV est false", () => {
    vi.stubEnv("DEV", false);
    renderPage();

    expect(
      screen.queryByText("Connexion développeur (local uniquement)"),
    ).not.toBeInTheDocument();
  });
});

describe("ConnexionPage — dev-login (import.meta.env.DEV)", () => {
  beforeEach(() => {
    vi.stubEnv("DEV", true);
  });

  it("affiche le formulaire dev-login en environnement de développement", () => {
    renderPage();

    expect(screen.getByText("Connexion développeur (local uniquement)")).toBeInTheDocument();
  });

  it("appelle devLogin puis setAuthToken et redirige vers la page mémorisée à la soumission", async () => {
    mockDevLogin.mockResolvedValue({ token: "fake-jwt" });
    mockConsumeRedirectPath.mockReturnValue("/challenge");
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Nom affiché"), {
      target: { value: "Wayne Gretzky" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter (dev)" }));

    await waitFor(() => {
      expect(mockDevLogin).toHaveBeenCalledWith("test@example.com", "Wayne Gretzky");
    });
    expect(mockSetAuthToken).toHaveBeenCalledWith("fake-jwt");
    expect(mockNavigate).toHaveBeenCalledWith("/challenge", { replace: true });
  });

  it("affiche un message d'erreur quand devLogin échoue, sans naviguer", async () => {
    mockDevLogin.mockRejectedValue(new Error("network"));
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Nom affiché"), {
      target: { value: "Wayne Gretzky" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter (dev)" }));

    await waitFor(() => {
      expect(screen.getByText("Connexion développeur impossible.")).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockSetAuthToken).not.toHaveBeenCalled();
  });
});
