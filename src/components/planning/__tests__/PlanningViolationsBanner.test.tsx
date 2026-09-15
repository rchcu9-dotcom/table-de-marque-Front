import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import PlanningViolationsBanner from "../PlanningViolationsBanner";

describe("PlanningViolationsBanner", () => {
  it("affiche un message positif quand il n'y a aucune violation", () => {
    render(<PlanningViolationsBanner violations={[]} />);
    expect(screen.getByText("Aucune violation de contrainte.")).toBeInTheDocument();
  });

  it("affiche le nombre de violations et leur liste", () => {
    render(
      <PlanningViolationsBanner
        violations={["real:1 : chevauchement match/match (10 min)", "2 équipe(s) fictive(s) présente(s)"]}
      />,
    );
    expect(screen.getByText("2 violation(s)")).toBeInTheDocument();
    expect(screen.getByText(/chevauchement match\/match/)).toBeInTheDocument();
    expect(screen.getByText(/équipe\(s\) fictive\(s\)/)).toBeInTheDocument();
  });
});
