import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import TopBar from "../TopBar";

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
  mockSetSelectedTeam.mockClear();
  mockToggleMuted.mockClear();
  mockNavigate.mockClear();
});

describe("TopBar — sélecteur d'équipe", () => {
  it("affiche le bouton texte « Mon équipe » sans logo quand aucune équipe n'est sélectionnée", () => {
    renderTopBar();

    const btn = screen.getByRole("button", { name: "Mon équipe" });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe("BUTTON");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(btn).toHaveAttribute("title", "Sélectionner une équipe");
  });

  it("ouvre le sélecteur d'équipe au clic sur « Mon équipe »", () => {
    renderTopBar();

    fireEvent.click(screen.getByRole("button", { name: "Mon équipe" }));

    expect(screen.getByText("Choisir une équipe")).toBeInTheDocument();
  });

  it("affiche le logo de l'équipe et masque la mention « Mon équipe » quand une équipe est sélectionnée", () => {
    mockSelectedTeam = { id: "rennes", name: "Rennes", logoUrl: "logo-rennes" };
    renderTopBar();

    expect(screen.queryByText("Mon équipe")).not.toBeInTheDocument();
    const img = screen.getByRole("img", { name: "Rennes" });
    expect(img).toHaveAttribute("src", "logo-rennes");
    expect(screen.getByTitle("Annuler la sélection : Rennes")).toBeInTheDocument();
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

    fireEvent.click(screen.getByTitle("Annuler la sélection : Rennes"));

    expect(mockSetSelectedTeam).toHaveBeenCalledWith(null);
  });

  it("conserve le toggle muted au double-clic sur le logo de l'équipe sélectionnée", () => {
    mockSelectedTeam = { id: "rennes", name: "Rennes", logoUrl: "logo-rennes" };
    renderTopBar();

    fireEvent.doubleClick(screen.getByTitle("Annuler la sélection : Rennes"));

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
