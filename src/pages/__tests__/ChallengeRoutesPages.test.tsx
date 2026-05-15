import "@testing-library/jest-dom/vitest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TeamsPage from "../TeamsPage";
import ChallengeAtelierPage from "../ChallengeAtelierPage";
import ChallengeDetailPage from "../ChallengeDetailPage";
import ChallengeEquipePage from "../ChallengeEquipePage";
import type { ChallengeAllResponse, ChallengeAttempt, ChallengeEquipeResponse } from "../../api/challenge";
import type { Team } from "../../api/team";

let teams: Team[] = [];
let challengeAll: ChallengeAllResponse;
let challengeByEquipe: ChallengeEquipeResponse;
let selectedTeam: Team | null = null;
let teamsLoading = false;
let teamsError = false;
let challengeAllLoading = false;
let challengeAllError = false;
let challengeEquipeLoading = false;
let challengeEquipeError = false;

function attempt(overrides: Partial<ChallengeAttempt>): ChallengeAttempt {
  return {
    joueurId: overrides.joueurId ?? "j1",
    joueurName: overrides.joueurName ?? "Alice",
    equipeId: overrides.equipeId ?? "rennes",
    equipeName: overrides.equipeName ?? "Rennes",
    equipeLogoUrl: overrides.equipeLogoUrl ?? null,
    atelierId: overrides.atelierId ?? "vitesse-1",
    atelierLabel: overrides.atelierLabel ?? "Atelier Vitesse",
    atelierType: overrides.atelierType ?? "vitesse",
    phase: overrides.phase ?? "evaluation",
    attemptDate: overrides.attemptDate ?? "2026-05-23T09:00:00.000Z",
    metrics: overrides.metrics ?? { type: "vitesse", tempsMs: 23000 },
  };
}

function resetFixtures() {
  teams = [
    { id: "rennes", name: "Rennes", logoUrl: "rennes.png" },
    { id: "paris", name: "Paris", logoUrl: null },
  ];
  challengeAll = {
    jour1: [
      attempt({ joueurId: "slow", joueurName: "Slow Rennes", equipeId: "rennes", equipeName: "Rennes", metrics: { type: "vitesse", tempsMs: 25000 } }),
      attempt({ joueurId: "fast", joueurName: "Fast Paris", equipeId: "paris", equipeName: "Paris", metrics: { type: "vitesse", tempsMs: 21000 } }),
      attempt({ joueurId: "tir", joueurName: "Shooter Rennes", atelierId: "tir-1", atelierType: "tir", metrics: { type: "tir", tirs: [3, 2, 1], totalPoints: 6 } }),
    ],
    jour3: [],
    autres: [],
  };
  challengeByEquipe = {
    equipeId: "rennes",
    equipeName: "Rennes",
    jour1: [
      attempt({ joueurId: "rv", joueurName: "Rennes Vitesse", metrics: { type: "vitesse", tempsMs: 22000 } }),
      attempt({ joueurId: "rt", joueurName: "Rennes Tir", atelierId: "tir-1", atelierType: "tir", metrics: { type: "tir", tirs: [2, 2, 1], totalPoints: 5 } }),
      attempt({ joueurId: "rg", joueurName: "Rennes Agile", atelierId: "glisse-1", atelierType: "glisse_crosse", metrics: { type: "glisse_crosse", tempsMs: 26000, penalites: 1 } }),
    ],
    jour3: [
      attempt({ joueurId: "qf1", joueurName: "Quart Rennes", atelierId: "finale-vitesse-qf", phase: "finale", attemptDate: "2026-05-25T09:00:00.000Z" }),
      attempt({ joueurId: "f1", joueurName: "Finale Rennes", atelierId: "finale-vitesse-finale", phase: "finale", attemptDate: "2026-05-25T10:00:00.000Z" }),
    ],
    autres: [],
  };
  selectedTeam = null;
  teamsLoading = false;
  teamsError = false;
  challengeAllLoading = false;
  challengeAllError = false;
  challengeEquipeLoading = false;
  challengeEquipeError = false;
}

function renderRoute(route: string, element: React.ReactNode, path: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock("../../hooks/useTeams", () => ({
  useTeams: () => ({
    data: teams,
    isLoading: teamsLoading,
    isError: teamsError,
    refetch: vi.fn(),
  }),
}));

vi.mock("../../hooks/useChallengeAll", () => ({
  useChallengeAll: () => ({
    data: challengeAll,
    isLoading: challengeAllLoading,
    isError: challengeAllError,
  }),
}));

vi.mock("../../hooks/useChallengeByEquipe", () => ({
  useChallengeByEquipe: () => ({
    data: challengeByEquipe,
    isLoading: challengeEquipeLoading,
    isError: challengeEquipeError,
  }),
}));

vi.mock("../../hooks/useChallengeJ1Momentum", () => ({
  useChallengeJ1Momentum: () => ({ data: [], isLoading: false, isError: false }),
}));

vi.mock("../../hooks/useChallengeGardienJ3", () => ({
  useChallengeGardienJ3: () => ({ data: undefined, isLoading: false, isError: false }),
}));

vi.mock("../../providers/SelectedTeamProvider", () => ({
  useSelectedTeam: () => ({ selectedTeam }),
}));

describe("TeamsPage", () => {
  beforeEach(resetFixtures);

  it("liste les equipes et construit les liens detail", () => {
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /Toutes les/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Rennes/i })).toHaveAttribute("href", "/teams/rennes");
    expect(screen.getByRole("link", { name: /Paris/i })).toHaveAttribute("href", "/teams/paris");
  });

  it("affiche les etats loading et erreur sans masquer le conteneur", () => {
    teamsLoading = true;
    teamsError = true;

    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Chargement...")).toBeInTheDocument();
    expect(screen.getByText(/Erreur lors du chargement/i)).toBeInTheDocument();
  });
});

describe("ChallengeAtelierPage", () => {
  beforeEach(resetFixtures);

  it("trie les resultats vitesse par temps et filtre la recherche", () => {
    renderRoute("/challenge/atelier/vitesse", <ChallengeAtelierPage />, "/challenge/atelier/:type");

    const rows = screen.getAllByTestId(/challenge-attempt-/);
    expect(within(rows[0]).getByText("Fast Paris")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Slow Rennes")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Filtrer/i), { target: { value: "rennes" } });

    expect(screen.getByText("Slow Rennes")).toBeInTheDocument();
    expect(screen.queryByText("Fast Paris")).not.toBeInTheDocument();
  });

  it("filtre par equipe suivie et gere un type inconnu", () => {
    selectedTeam = { id: "rennes", name: "Rennes" };
    renderRoute("/challenge/atelier/vitesse", <ChallengeAtelierPage />, "/challenge/atelier/:type");

    expect(screen.getByText("Slow Rennes")).toBeInTheDocument();
    expect(screen.queryByText("Fast Paris")).not.toBeInTheDocument();

    cleanup();
    renderRoute("/challenge/atelier/inconnu", <ChallengeAtelierPage />, "/challenge/atelier/:type");

    expect(screen.getByText("Atelier inconnu.")).toBeInTheDocument();
  });
});

describe("ChallengeEquipePage", () => {
  beforeEach(resetFixtures);

  it("affiche les evaluations et finales de l equipe", () => {
    renderRoute("/challenge/equipe/rennes", <ChallengeEquipePage />, "/challenge/equipe/:teamId");

    expect(screen.getByRole("heading", { name: "Rennes" })).toBeInTheDocument();
    expect(screen.getAllByText(/Evaluation/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Finales du Challenge Vitesse/i)).toBeInTheDocument();
    expect(screen.getByText("Rennes Vitesse")).toBeInTheDocument();
    expect(screen.getByText("Rennes Tir")).toBeInTheDocument();
    expect(screen.getByText("Rennes Agile")).toBeInTheDocument();
  });

  it("filtre les joueurs et masque une section via toggle", () => {
    renderRoute("/challenge/equipe/rennes", <ChallengeEquipePage />, "/challenge/equipe/:teamId");

    fireEvent.change(screen.getByPlaceholderText(/Recherche joueur/i), { target: { value: "tir" } });
    expect(screen.getByText("Rennes Tir")).toBeInTheDocument();
    expect(screen.queryByText("Rennes Vitesse")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Evaluation" }));
    expect(screen.queryByText("Rennes Tir")).not.toBeInTheDocument();
  });
});

describe("ChallengeDetailPage", () => {
  beforeEach(resetFixtures);

  it("rend le detail challenge avec fil d ariane, top 3 et finales", () => {
    renderRoute("/challenge/rennes", <ChallengeDetailPage />, "/challenge/:id");

    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rennes" })).toBeInTheDocument();
    expect(screen.getByText(/Finales du Challenge Vitesse/i)).toBeInTheDocument();
    expect(screen.getAllByText("Rennes Vitesse").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rennes Tir").length).toBeGreaterThan(0);
  });

  it("filtre par joueur via la selection et permet de desactiver le Top 3", () => {
    renderRoute("/challenge/rennes", <ChallengeDetailPage />, "/challenge/:id");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Rennes Tir" } });
    expect(screen.getAllByText("Rennes Tir").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("challenge-attempt-vitesse-1-rv-0")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Top 3" }));
    expect(screen.getAllByText("Rennes Tir").length).toBeGreaterThan(0);
  });
});
