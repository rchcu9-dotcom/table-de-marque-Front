import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import PlanningGanttChart from "../PlanningGanttChart";
import type { SimulationResult } from "../../../api/planning";

function makeSimulation(overrides: Partial<SimulationResult> = {}): SimulationResult {
  return {
    id: "sim-1",
    editionId: 1,
    generatedAt: "2026-09-05T10:00:00.000Z",
    score: { penalty: 0, slack: 0 },
    violations: [],
    equipes: [
      { ref: "real:1", nom: "Les Aigles", fictive: false, equipeId: 1 },
      { ref: "real:2", nom: "Les Loups", fictive: false, equipeId: 2 },
    ],
    matches: [
      {
        numMatch: 1,
        jour: 1,
        matchCase: 1,
        equipe1Ref: "real:1",
        equipe1Nom: "Les Aigles",
        equipe2Ref: "real:2",
        equipe2Nom: "Les Loups",
        dateHeure: "2026-05-23T09:00:00.000Z",
        dureeMin: 27,
        is3v3: false,
        poule: "A",
        phase: "BRASSAGE",
      },
    ],
    activites: [
      {
        creneauId: 1,
        activiteId: 10,
        activiteLabel: "Repas",
        equipeRef: "real:1",
        equipeNom: "Les Aigles",
        debut: "2026-05-23T11:00:00.000Z",
        fin: "2026-05-23T11:40:00.000Z",
      },
    ],
    mode: { parametresParDefautUtilises: [], effectifComplete: false },
    ...overrides,
  };
}

describe("PlanningGanttChart", () => {
  it("affiche une ligne par équipe apparaissant dans les matchs ou activités", () => {
    render(<PlanningGanttChart simulation={makeSimulation()} />);
    expect(screen.getByText("Les Aigles")).toBeInTheDocument();
    expect(screen.getByText("Les Loups")).toBeInTheDocument();
  });

  it("différencie visuellement une équipe fictive (libellé et style italique)", () => {
    const simulation = makeSimulation({
      equipes: [{ ref: "fictive:1", nom: "Équipe 1", fictive: true, equipeId: null }],
      matches: [
        {
          numMatch: 1,
          jour: 1,
          matchCase: 1,
          equipe1Ref: "fictive:1",
          equipe1Nom: "Équipe 1",
          equipe2Ref: "fictive:2",
          equipe2Nom: "Équipe 2",
          dateHeure: "2026-05-23T09:00:00.000Z",
          dureeMin: 27,
          is3v3: false,
          poule: "A",
          phase: "BRASSAGE",
        },
      ],
      activites: [],
    });
    render(<PlanningGanttChart simulation={simulation} />);
    const label = screen.getByText("Équipe 1 (fictive)");
    expect(label).toBeInTheDocument();
    expect(label.getAttribute("font-style")).toBe("italic");
  });

  it("rend un graphique SVG accessible avec un rôle image", () => {
    render(<PlanningGanttChart simulation={makeSimulation()} />);
    expect(screen.getByRole("img", { name: "Gantt du planning simulé" })).toBeInTheDocument();
  });

  it("différencie visuellement un repas placeholder de qualification (libellé « à déterminer », jamais confondu avec une équipe fictive)", () => {
    const simulation = makeSimulation({
      equipes: [],
      matches: [],
      activites: [
        {
          creneauId: 1,
          activiteId: 10,
          activiteLabel: "Repas",
          equipeRef: "placeholder:poule-A-rang-1",
          equipeNom: "1er Poule A",
          debut: "2026-05-24T11:00:00.000Z",
          fin: "2026-05-24T11:40:00.000Z",
        },
      ],
    });
    render(<PlanningGanttChart simulation={simulation} />);

    const label = screen.getByText("1er Poule A (à déterminer)");
    expect(label).toBeInTheDocument();
    // Distinct du style "(fictive)" : jamais en italique, couleur différente.
    expect(label.getAttribute("font-style")).toBe("normal");
    expect(label.getAttribute("fill")).toBe("#fbbf24");
    expect(screen.queryByText("1er Poule A (fictive)")).not.toBeInTheDocument();
  });

  it("affiche le libellé placeholder (equipeNom) pour un repas sans match ce jour-là, jamais la ref technique brute", () => {
    const simulation = makeSimulation({
      equipes: [],
      matches: [],
      activites: [
        {
          creneauId: 1,
          activiteId: 10,
          activiteLabel: "Repas",
          equipeRef: "placeholder:poule-A-rang-1",
          equipeNom: "1er Poule A",
          debut: "2026-05-24T11:00:00.000Z",
          fin: "2026-05-24T11:40:00.000Z",
        },
      ],
    });
    render(<PlanningGanttChart simulation={simulation} />);

    expect(screen.queryByText(/placeholder:poule-A-rang-1/)).not.toBeInTheDocument();
  });

  it("reste générique pour une activité arbitraire du catalogue (au-delà de Repas/Challenge)", () => {
    const simulation = makeSimulation({
      matches: [],
      activites: [
        {
          creneauId: 1,
          activiteId: 99,
          activiteLabel: "Photo officielle",
          equipeRef: "real:1",
          equipeNom: "Les Aigles",
          debut: "2026-05-23T11:00:00.000Z",
          fin: "2026-05-23T11:40:00.000Z",
        },
      ],
    });
    render(<PlanningGanttChart simulation={simulation} />);

    expect(screen.getByText("Les Aigles")).toBeInTheDocument();
  });
});
