// Tests — SelectedTeamAuthSync : l'équipe suivie (localStorage, réglage de confort du
// navigateur) ne doit jamais survivre à un changement d'identité authentifiée, sous peine
// d'afficher à un utilisateur l'équipe suivie par un AUTRE compte sur le même navigateur
// (bug confirmé en usage réel — cf. commentaire du composant).
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SelectedTeamProvider, SelectedTeamAuthSync, useSelectedTeam } from "../SelectedTeamProvider";

const mockUseAuth = vi.fn();
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

function Consumer() {
  const { selectedTeam, setSelectedTeam } = useSelectedTeam();
  return (
    <div>
      <span data-testid="selected">{selectedTeam ? selectedTeam.name : "(aucune)"}</span>
      <button onClick={() => setSelectedTeam({ id: "loups", name: "Loups de Lyon" })}>
        Suivre les Loups
      </button>
    </div>
  );
}

function renderHarness() {
  return render(
    <SelectedTeamProvider>
      <SelectedTeamAuthSync />
      <Consumer />
    </SelectedTeamProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  mockUseAuth.mockReturnValue({ user: null });
});

describe("SelectedTeamAuthSync", () => {
  it("efface l'équipe suivie à la connexion (uid null -> uid réel)", () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { rerender } = renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Suivre les Loups" }));
    expect(screen.getByTestId("selected")).toHaveTextContent("Loups de Lyon");

    mockUseAuth.mockReturnValue({ user: { uid: "uid-4test" } });
    rerender(
      <SelectedTeamProvider>
        <SelectedTeamAuthSync />
        <Consumer />
      </SelectedTeamProvider>,
    );

    expect(screen.getByTestId("selected")).toHaveTextContent("(aucune)");
    expect(localStorage.getItem("selected-team")).toBeNull();
  });

  it("efface l'équipe suivie à la déconnexion (uid réel -> null)", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid-testX" } });
    const { rerender } = renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Suivre les Loups" }));
    expect(screen.getByTestId("selected")).toHaveTextContent("Loups de Lyon");

    mockUseAuth.mockReturnValue({ user: null });
    rerender(
      <SelectedTeamProvider>
        <SelectedTeamAuthSync />
        <Consumer />
      </SelectedTeamProvider>,
    );

    expect(screen.getByTestId("selected")).toHaveTextContent("(aucune)");
  });

  it("efface l'équipe suivie en changeant de compte (uid-1 -> uid-2)", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid-test4" } });
    const { rerender } = renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Suivre les Loups" }));
    expect(screen.getByTestId("selected")).toHaveTextContent("Loups de Lyon");

    mockUseAuth.mockReturnValue({ user: { uid: "uid-4test" } });
    rerender(
      <SelectedTeamProvider>
        <SelectedTeamAuthSync />
        <Consumer />
      </SelectedTeamProvider>,
    );

    expect(screen.getByTestId("selected")).toHaveTextContent("(aucune)");
  });

  it("ne touche pas à l'équipe suivie quand l'identité ne change pas (re-render avec le même uid)", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid-stable" } });
    const { rerender } = renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Suivre les Loups" }));
    expect(screen.getByTestId("selected")).toHaveTextContent("Loups de Lyon");

    // Même uid, juste un re-render (ex. déclenché par un autre état du composant).
    mockUseAuth.mockReturnValue({ user: { uid: "uid-stable" } });
    rerender(
      <SelectedTeamProvider>
        <SelectedTeamAuthSync />
        <Consumer />
      </SelectedTeamProvider>,
    );

    expect(screen.getByTestId("selected")).toHaveTextContent("Loups de Lyon");
  });
});
