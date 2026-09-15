import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import SimulationControls from "../SimulationControls";
import type { SimulationResult } from "../../../api/planning";

function makeSimulation(overrides: Partial<SimulationResult> = {}): SimulationResult {
  return {
    id: "sim-1",
    editionId: 1,
    generatedAt: "2026-09-05T10:00:00.000Z",
    score: { penalty: 0, slack: 0 },
    violations: [],
    equipes: [],
    matches: [],
    activites: [],
    mode: { parametresParDefautUtilises: [], effectifComplete: false },
    ...overrides,
  };
}

const NOOP_PROPS = {
  onSimuler: vi.fn(),
  onExporter: vi.fn(),
  onConfirmer: vi.fn(),
  isSimulating: false,
  isExporting: false,
  isConfirming: false,
};

describe("SimulationControls", () => {
  it("désactive Exporter et Confirmer tant qu'aucune simulation n'existe", () => {
    render(<SimulationControls {...NOOP_PROPS} simulation={null} />);
    expect(screen.getByRole("button", { name: "Exporter" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeDisabled();
  });

  it("active Exporter et Confirmer une fois une simulation disponible", () => {
    render(<SimulationControls {...NOOP_PROPS} simulation={makeSimulation()} />);
    expect(screen.getByRole("button", { name: "Exporter" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeEnabled();
  });

  it("appelle onSimuler avec le nombre d'équipes cible saisi", () => {
    const onSimuler = vi.fn();
    render(<SimulationControls {...NOOP_PROPS} onSimuler={onSimuler} simulation={null} />);

    fireEvent.change(screen.getByPlaceholderText("défaut : nb places max"), {
      target: { value: "8" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simuler" }));

    expect(onSimuler).toHaveBeenCalledWith(8);
  });

  it("appelle onSimuler avec undefined si aucun nombre d'équipes cible n'est saisi", () => {
    const onSimuler = vi.fn();
    render(<SimulationControls {...NOOP_PROPS} onSimuler={onSimuler} simulation={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Simuler" }));
    expect(onSimuler).toHaveBeenCalledWith(undefined);
  });

  it("appelle onExporter et onConfirmer(false) quand aucune équipe fictive n'est présente", () => {
    const onExporter = vi.fn();
    const onConfirmer = vi.fn();
    render(
      <SimulationControls
        {...NOOP_PROPS}
        onExporter={onExporter}
        onConfirmer={onConfirmer}
        simulation={makeSimulation()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Exporter" }));
    expect(onExporter).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(onConfirmer).toHaveBeenCalledWith(false);
  });

  it("libelle le bouton de confirmation différemment et appelle onConfirmer(true) quand des équipes fictives sont présentes", () => {
    const onConfirmer = vi.fn();
    const simulation = makeSimulation({
      equipes: [{ ref: "fictive:1", nom: "Équipe 1", fictive: true, equipeId: null }],
    });
    render(<SimulationControls {...NOOP_PROPS} onConfirmer={onConfirmer} simulation={simulation} />);

    const bouton = screen.getByRole("button", { name: "Confirmer malgré les équipes fictives" });
    fireEvent.click(bouton);
    expect(onConfirmer).toHaveBeenCalledWith(true);
  });

  it("affiche l'état de simulation en cours et désactive le bouton Simuler", () => {
    render(<SimulationControls {...NOOP_PROPS} isSimulating={true} simulation={null} />);
    expect(screen.getByRole("button", { name: "Simulation en cours…" })).toBeDisabled();
  });
});
