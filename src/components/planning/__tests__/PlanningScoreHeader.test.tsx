import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import PlanningScoreHeader from "../PlanningScoreHeader";
import type { SimulationResult } from "../../../api/planning";

function makeSimulation(overrides: Partial<SimulationResult> = {}): SimulationResult {
  return {
    id: "sim-1",
    editionId: 1,
    generatedAt: "2026-09-05T10:00:00.000Z",
    score: { penalty: 12, slack: 34 },
    violations: [],
    equipes: [],
    matches: [],
    activites: [],
    mode: { parametresParDefautUtilises: [], effectifComplete: false },
    ...overrides,
  };
}

describe("PlanningScoreHeader", () => {
  it("affiche le score (penalty/slack) et la date de génération", () => {
    render(<PlanningScoreHeader simulation={makeSimulation()} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("34")).toBeInTheDocument();
    expect(screen.getByText(/Généré le/)).toBeInTheDocument();
  });

  it("signale les paramètres par défaut utilisés quand la liste n'est pas vide", () => {
    render(
      <PlanningScoreHeader
        simulation={makeSimulation({
          mode: { parametresParDefautUtilises: ["nbPoules", "formatPhaseFinale"], effectifComplete: false },
        })}
      />,
    );
    expect(screen.getByText(/Valeurs par défaut non confirmées/)).toBeInTheDocument();
    expect(screen.getByText(/nbPoules, formatPhaseFinale/)).toBeInTheDocument();
  });

  it("ne signale rien sur les paramètres par défaut quand la liste est vide", () => {
    render(<PlanningScoreHeader simulation={makeSimulation()} />);
    expect(screen.queryByText(/Valeurs par défaut non confirmées/)).not.toBeInTheDocument();
  });

  it("signale un effectif complété par des équipes fictives", () => {
    render(
      <PlanningScoreHeader
        simulation={makeSimulation({
          mode: { parametresParDefautUtilises: [], effectifComplete: true },
        })}
      />,
    );
    expect(screen.getByText(/Effectif complété par des équipes fictives/)).toBeInTheDocument();
  });
});
