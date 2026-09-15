import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AuthCallbackPage from "../AuthCallbackPage";

const mockNavigate = vi.fn();
const mockSetAuthToken = vi.fn();
const mockConsumeRedirectPath = vi.fn();

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ setAuthToken: mockSetAuthToken }),
}));

vi.mock("../../auth/postLoginRedirect", () => ({
  consumeRedirectPath: (fallback: string) => mockConsumeRedirectPath(fallback),
}));

vi.mock("react-router-dom", async (orig) => {
  const mod = await orig();
  return {
    ...(mod as any),
    useNavigate: () => mockNavigate,
  };
});

function renderPage() {
  // AuthCallbackPage lit window.location.search directement (pas useSearchParams) :
  // MemoryRouter ne touche pas window.location, il faut le poser explicitement.
  window.history.pushState({}, "", "/auth/callback?token=fake-jwt");
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockSetAuthToken.mockClear();
  mockConsumeRedirectPath.mockReturnValue("/inscription");
});

describe("AuthCallbackPage", () => {
  it("stocke le token puis redirige vers la page mémorisée par consumeRedirectPath (pas systématiquement /inscription)", async () => {
    mockConsumeRedirectPath.mockReturnValue("/challenge");
    renderPage();

    await waitFor(() => {
      expect(mockSetAuthToken).toHaveBeenCalledWith("fake-jwt");
    });
    expect(mockConsumeRedirectPath).toHaveBeenCalledWith("/inscription");
    expect(mockNavigate).toHaveBeenCalledWith("/challenge", { replace: true });
  });

  it("retombe sur /inscription quand rien n'a été mémorisé", async () => {
    mockConsumeRedirectPath.mockReturnValue("/inscription");
    renderPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/inscription", { replace: true });
    });
  });
});
