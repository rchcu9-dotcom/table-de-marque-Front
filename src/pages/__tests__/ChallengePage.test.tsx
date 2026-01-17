import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChallengePage from "../ChallengePage";
import type { ChallengeAllResponse } from "../../api/challenge";

const mockData: ChallengeAllResponse = {
  jour1: [
    {
      joueurId: "p1",
      joueurName: "Rennes Joueur 1",
      equipeId: "rennes",
      equipeName: "Rennes",
      atelierId: "vitesse-1",
      atelierLabel: "Atelier Vitesse",
      atelierType: "vitesse",
      phase: "evaluation",
      attemptDate: "2026-05-23T09:00:00.000Z",
      metrics: { type: "vitesse", tempsMs: 27000 },
    },
  ],
  jour3: [
    {
      joueurId: "p2",
      joueurName: "Rennes Joueur 2",
      equipeId: "rennes",
      equipeName: "Rennes",
      atelierId: "finale-vitesse-qf",
      atelierLabel: "Quart de finale Vitesse",
      atelierType: "vitesse",
      phase: "finale",
      attemptDate: "2026-05-25T09:00:00.000Z",
      metrics: { type: "vitesse", tempsMs: 26000 },
    },
  ],
  autres: [],
};

beforeAll(() => {
  (HTMLElement.prototype as any).scrollTo = vi.fn();
});

vi.mock("../../hooks/useChallengeAll", () => ({
  useChallengeAll: () => ({ data: mockData, isLoading: false, isError: false }),
}));

vi.mock("../../hooks/useTeams", () => ({
  useTeams: () => ({
    data: [{ id: "rennes", name: "Rennes", logoUrl: "logo.png" }],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../../providers/SelectedTeamProvider", () => ({
  useSelectedTeam: () => ({ selectedTeam: { id: "rennes", name: "Rennes", logoUrl: "logo.png" } }),
}));

describe("ChallengePage", () => {
  it("affiche les blocs top3 et finales avec les données mockées", () => {
    render(
      <MemoryRouter>
        <ChallengePage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Atelier Vitesse/i)).toBeInTheDocument();
    expect(screen.getByText("Rennes Joueur 1")).toBeInTheDocument();
    expect(screen.getByText(/Quarts de finale/i)).toBeInTheDocument();
    expect(screen.getByText("Rennes Joueur 2")).toBeInTheDocument();
    expect(screen.getAllByTestId("challenge-attempts").length).toBeGreaterThan(0);
    expect(screen.getByTestId("challenge-attempt-vitesse-1-p1-0")).toBeInTheDocument();
  });
});
