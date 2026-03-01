import "@testing-library/jest-dom/vitest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChallengePage from "../ChallengePage";
import type {
  ChallengeAllResponse,
  ChallengeAttempt,
  ChallengeVitesseJ3Response,
  VitesseJ3Player,
} from "../../api/challenge";

type SelectedTeam = {
  id: string;
  name: string;
  logoUrl?: string;
};

let mockChallengeAll: ChallengeAllResponse;
let mockVitesseJ3: ChallengeVitesseJ3Response;
let mockSelectedTeam: SelectedTeam | null = null;

function buildAttempt(overrides: Partial<ChallengeAttempt>): ChallengeAttempt {
  return {
    joueurId: overrides.joueurId ?? "player-1",
    joueurName: overrides.joueurName ?? "Rennes Joueur 1",
    equipeId: overrides.equipeId ?? "rennes",
    equipeName: overrides.equipeName ?? "Rennes",
    equipeLogoUrl: overrides.equipeLogoUrl ?? null,
    atelierId: overrides.atelierId ?? "vitesse-1",
    atelierLabel: overrides.atelierLabel ?? "Atelier Vitesse",
    atelierType: overrides.atelierType ?? "vitesse",
    phase: overrides.phase ?? "evaluation",
    attemptDate: overrides.attemptDate ?? "2026-05-23T09:00:00.000Z",
    metrics: overrides.metrics ?? { type: "vitesse", tempsMs: 27000 },
  };
}

function buildVitessePlayer(overrides: Partial<VitesseJ3Player>): VitesseJ3Player {
  return {
    id: overrides.id ?? "player-j3-1",
    name: overrides.name ?? "Rennes Joueur 2",
    teamId: overrides.teamId ?? "rennes",
    teamName: overrides.teamName ?? "Rennes",
    status: overrides.status,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ChallengePage />
    </MemoryRouter>,
  );
}

function getFinalesSection() {
  return screen.getByText(/Finales du Challenge Vitesse/i).closest("section") as HTMLElement;
}

function resetFixtures() {
  mockChallengeAll = {
    jour1: [
      buildAttempt({
        joueurId: "j1-vitesse-1",
        joueurName: "Rennes Vitesse",
        atelierId: "vitesse-1",
        atelierLabel: "Atelier Vitesse",
        atelierType: "vitesse",
      }),
      buildAttempt({
        joueurId: "j1-tir-1",
        joueurName: "Rennes Tir",
        atelierId: "tir-1",
        atelierLabel: "Atelier Tir",
        atelierType: "tir",
        metrics: { type: "tir", tirs: [3, 2, 1], totalPoints: 6 },
      }),
      buildAttempt({
        joueurId: "j1-glisse-1",
        joueurName: "Rennes Agilité",
        atelierId: "glisse-1",
        atelierLabel: "Atelier Agilité",
        atelierType: "glisse_crosse",
        metrics: { type: "glisse_crosse", tempsMs: 28000, penalites: 0 },
      }),
      buildAttempt({
        joueurId: "j1-vitesse-2",
        joueurName: "Paris Vitesse",
        equipeId: "paris",
        equipeName: "Paris",
        atelierId: "vitesse-2",
        atelierLabel: "Atelier Vitesse",
        atelierType: "vitesse",
        metrics: { type: "vitesse", tempsMs: 27500 },
      }),
    ],
    jour3: [
      buildAttempt({
        joueurId: "legacy-j3-qf",
        joueurName: "Legacy Quart",
        atelierId: "finale-vitesse-qf",
        atelierLabel: "Quart de finale Vitesse",
        phase: "finale",
        attemptDate: "2026-05-25T09:48:00.000Z",
      }),
    ],
    autres: [],
  };
  mockVitesseJ3 = { slots: {}, winnerId: null };
  mockSelectedTeam = null;
}

beforeAll(() => {
  (HTMLElement.prototype as { scrollTo?: () => void }).scrollTo = vi.fn();
});

vi.mock("../../hooks/useChallengeAll", () => ({
  useChallengeAll: () => ({ data: mockChallengeAll, isLoading: false, isError: false }),
}));

vi.mock("../../hooks/useChallengeVitesseJ3", () => ({
  useChallengeVitesseJ3: () => ({
    data: mockVitesseJ3,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../../hooks/useTeams", () => ({
  useTeams: () => ({
    data: [
      { id: "rennes", name: "Rennes", logoUrl: "logo-rennes.png" },
      { id: "paris", name: "Paris", logoUrl: "logo-paris.png" },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../../providers/SelectedTeamProvider", () => ({
  useSelectedTeam: () => ({ selectedTeam: mockSelectedTeam }),
}));

describe("ChallengePage", () => {
  beforeEach(() => {
    resetFixtures();
  });

  it("utilise uniquement useChallengeVitesseJ3 pour le rendu J3 et ignore data.jour3 legacy", () => {
    mockChallengeAll.jour3 = [
      buildAttempt({
        joueurId: "legacy-only",
        joueurName: "Legacy Only",
        atelierId: "finale-vitesse-qf",
        atelierLabel: "Quart de finale Vitesse",
        phase: "finale",
      }),
    ];
    mockVitesseJ3 = { slots: {}, winnerId: null };

    renderPage();

    expect(screen.queryByText(/Finales du Challenge Vitesse/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Legacy Only")).not.toBeInTheDocument();
  });

  it("affiche uniquement les quarts quand seuls des slots QF sont fournis", () => {
    mockVitesseJ3 = {
      slots: {
        QF1: [buildVitessePlayer({ id: "qf-1", name: "Rennes Quart" })],
        QF2: [buildVitessePlayer({ id: "qf-2", name: "Paris Quart", teamId: "paris", teamName: "Paris" })],
      },
      winnerId: null,
    };

    renderPage();

    const finalesSection = getFinalesSection();
    expect(screen.getByText(/Finales du Challenge Vitesse/i)).toBeInTheDocument();
    expect(within(finalesSection).getByText("Quart de finale")).toBeInTheDocument();
    expect(within(finalesSection).getByText("Quart de Finale 1")).toBeInTheDocument();
    expect(within(finalesSection).getByText("Quart de Finale 2")).toBeInTheDocument();
    expect(within(finalesSection).queryByText("Demi Finales")).not.toBeInTheDocument();
    expect(within(finalesSection).queryByRole("heading", { level: 3, name: "Vitesse" })).not.toBeInTheDocument();
  });

  it("affiche uniquement les demis quand seuls des slots DF sont fournis", () => {
    mockVitesseJ3 = {
      slots: {
        DF1: [buildVitessePlayer({ id: "df-1", name: "Rennes Demi" })],
      },
      winnerId: null,
    };

    renderPage();

    const finalesSection = getFinalesSection();
    expect(screen.getByText(/Finales du Challenge Vitesse/i)).toBeInTheDocument();
    expect(within(finalesSection).getByText("Demi Finales")).toBeInTheDocument();
    expect(within(finalesSection).getByText("Demi Finale 1")).toBeInTheDocument();
    expect(within(finalesSection).queryByText("Quart de finale")).not.toBeInTheDocument();
    expect(within(finalesSection).queryByRole("heading", { level: 3, name: "Vitesse" })).not.toBeInTheDocument();
  });

  it("affiche uniquement la finale quand F1 contient des joueurs", () => {
    mockVitesseJ3 = {
      slots: {
        F1: [buildVitessePlayer({ id: "f-1", name: "Rennes Finaliste", status: "finalist" })],
      },
      winnerId: null,
    };

    renderPage();

    const finalesSection = getFinalesSection();
    expect(screen.getByText(/Finales du Challenge Vitesse/i)).toBeInTheDocument();
    expect(within(finalesSection).getByRole("heading", { level: 3, name: "Vitesse" })).toBeInTheDocument();
    expect(within(finalesSection).getByText("Rennes Finaliste")).toBeInTheDocument();
    expect(within(finalesSection).queryByText("Demi Finales")).not.toBeInTheDocument();
    expect(within(finalesSection).queryByText("Quart de finale")).not.toBeInTheDocument();
  });

  it("masque totalement le bloc Finales quand aucun slot canonique n'a de joueur", () => {
    mockVitesseJ3 = {
      slots: {
        F1: [],
        QF1: [],
        DF1: [],
      },
      winnerId: null,
    };

    renderPage();

    expect(screen.queryByText(/Finales du Challenge Vitesse/i)).not.toBeInTheDocument();
  });

  it("rend correctement un dataset partiel mixte et met en avant le vainqueur", () => {
    mockVitesseJ3 = {
      slots: {
        QF2: [buildVitessePlayer({ id: "qf-2", name: "Quart Deux", status: "qualified" })],
        DF1: [buildVitessePlayer({ id: "df-1", name: "Demi Un", status: "qualified" })],
        F1: [
          buildVitessePlayer({ id: "winner", name: "Grand Vainqueur", status: "winner" }),
          buildVitessePlayer({ id: "finalist", name: "Autre Finaliste", status: "finalist" }),
        ],
      },
      winnerId: "winner",
    };

    renderPage();

    const finalesSection = getFinalesSection();
    expect(within(finalesSection).getByText("Quart de finale")).toBeInTheDocument();
    expect(within(finalesSection).getByText("Quart de Finale 2")).toBeInTheDocument();
    expect(within(finalesSection).getByText("Demi Finales")).toBeInTheDocument();
    expect(within(finalesSection).getByText("Demi Finale 1")).toBeInTheDocument();
    expect(within(finalesSection).getByRole("heading", { level: 3, name: "Vitesse" })).toBeInTheDocument();
    expect(within(finalesSection).getByText("Grand Vainqueur")).toBeInTheDocument();
    expect(within(finalesSection).getAllByText("Vainqueur").length).toBeGreaterThan(0);
  });

  it("avec une équipe suivie, le rendu J3 canonique reste stable et sans double affichage", () => {
    mockSelectedTeam = { id: "rennes", name: "Rennes", logoUrl: "logo-rennes.png" };
    mockVitesseJ3 = {
      slots: {
        QF1: [buildVitessePlayer({ id: "qf-rennes", name: "Rennes Quart", teamId: "rennes", teamName: "Rennes" })],
        QF2: [buildVitessePlayer({ id: "qf-paris", name: "Paris Quart", teamId: "paris", teamName: "Paris" })],
        F1: [buildVitessePlayer({ id: "f-rennes", name: "Rennes Finale", teamId: "rennes", teamName: "Rennes", status: "finalist" })],
      },
      winnerId: null,
    };

    renderPage();

    const finalesSection = getFinalesSection();
    expect(screen.getByText(/Équipe suivie : Rennes/i)).toBeInTheDocument();
    expect(within(finalesSection).getByText("Rennes Quart")).toBeInTheDocument();
    expect(within(finalesSection).getByText("Paris Quart")).toBeInTheDocument();
    expect(within(finalesSection).getByText("Rennes Finale")).toBeInTheDocument();
    expect(within(finalesSection).getByText("Quart de finale")).toBeInTheDocument();
    expect(within(finalesSection).getByRole("heading", { level: 3, name: "Vitesse" })).toBeInTheDocument();
  });

  it("conserve les blocs J1 d'évaluation Vitesse, Tir et Agilité", () => {
    renderPage();

    expect(screen.getByText("Atelier Vitesse")).toBeInTheDocument();
    expect(screen.getByText("Atelier Tir")).toBeInTheDocument();
    expect(screen.getByText("Atelier Agilite")).toBeInTheDocument();
    expect(screen.getByText("Rennes Vitesse")).toBeInTheDocument();
    expect(screen.getByText("Rennes Tir")).toBeInTheDocument();
    expect(screen.getByText("Rennes Agilité")).toBeInTheDocument();
    expect(screen.getAllByTestId("challenge-attempts").length).toBeGreaterThan(0);
  });

  it("affiche naturellement les quarts QF dès qu'ils sont présents, sans double affichage", () => {
    mockVitesseJ3 = {
      slots: {
        QF3: [buildVitessePlayer({ id: "qf-3", name: "QF Anticipe" })],
      },
      winnerId: null,
    };
    mockChallengeAll.jour3 = [
      buildAttempt({
        joueurId: "legacy-duplicate",
        joueurName: "QF Anticipe",
        atelierId: "legacy-qf-3",
        atelierLabel: "Quart de finale legacy",
        phase: "finale",
      }),
    ];

    renderPage();

    expect(screen.getByText("Quart de Finale 3")).toBeInTheDocument();
    expect(screen.getByText("QF Anticipe")).toBeInTheDocument();
    expect(screen.getAllByText("QF Anticipe")).toHaveLength(1);
  });
});
