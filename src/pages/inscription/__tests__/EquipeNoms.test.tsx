import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { EquipeNoms } from "../EquipeNoms";

// docs/specs/-prise-en-compte-du-nom-court-pour-les-logos-contexte-actuel.md — CA4

describe("EquipeNoms", () => {
  it("affiche le nom court en ligne principale et le nom complet en dessous, en plus petit", () => {
    const { container } = render(
      <EquipeNoms nom="Courbevoie" nomComplet="Les Coqs de Courbevoie" />,
    );

    const lignes = container.firstElementChild!.children;
    expect(lignes).toHaveLength(2);
    expect(lignes[0]).toHaveTextContent("Courbevoie");
    expect(lignes[1]).toHaveTextContent("Les Coqs de Courbevoie");
    // Le nom complet vient après le nom court dans le document.
    expect(
      lignes[0].compareDocumentPosition(lignes[1]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(lignes[1]).toHaveClass("text-xs");
    expect(lignes[0]).not.toHaveClass("text-xs");
  });

  it.each([
    ["absent", undefined],
    ["null", null],
    ["vide", ""],
  ])("n'affiche qu'une ligne quand le nom complet est %s", (_cas, nomComplet) => {
    const { container } = render(<EquipeNoms nom="Rennes" nomComplet={nomComplet} />);

    expect(container.firstElementChild!.children).toHaveLength(1);
    expect(screen.getByText("Rennes")).toBeInTheDocument();
  });

  it("applique au conteneur la classe fournie par le parent", () => {
    const { container } = render(<EquipeNoms nom="Rennes" className="flex-1 text-sm" />);

    expect(container.firstElementChild).toHaveClass("flex-1", "text-sm", "flex-col");
  });
});
