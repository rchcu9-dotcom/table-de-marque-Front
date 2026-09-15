import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import PhaseCycleFrise from "../PhaseCycleFrise";

describe("PhaseCycleFrise", () => {
  it("affiche les 4 cases du cycle", () => {
    render(<PhaseCycleFrise etape="INSCRIPTIONS_OUVERTES" />);

    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it.each([
    ["CREEE", "Préparation"],
    ["CREATION_NOUVEAU_TOURNOI", "Préparation"],
    ["INSCRIPTIONS_OUVERTES", "Inscriptions ouvertes"],
    ["CLOTUREE", "Clôturée"],
    ["TOURNOI_DEMARRE", "Tournoi démarré"],
  ] as const)("affiche le libellé de la phase courante en clair pour etape=%s", (etape, label) => {
    render(<PhaseCycleFrise etape={etape} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("regroupe CREEE et CREATION_NOUVEAU_TOURNOI sous une seule case Préparation courante", () => {
    render(<PhaseCycleFrise etape="CREEE" />);

    const courante = screen.getByText("Préparation");
    expect(courante).toHaveAttribute("aria-current", "step");
    expect(screen.getAllByText("Préparation")).toHaveLength(1);
  });

  it("indique quel sous-état Préparation est actif dans son tooltip", () => {
    render(<PhaseCycleFrise etape="CREEE" />);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveAttribute("title", "Préparation — CREEE (actif) / CREATION_NOUVEAU_TOURNOI");
  });

  it("indique CREATION_NOUVEAU_TOURNOI comme sous-état actif quand c'est l'étape courante", () => {
    render(<PhaseCycleFrise etape="CREATION_NOUVEAU_TOURNOI" />);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveAttribute("title", "Préparation — CREEE / CREATION_NOUVEAU_TOURNOI (actif)");
  });

  it("n'affiche aucun sous-état actif dans le tooltip Préparation quand ce n'est pas la phase courante", () => {
    render(<PhaseCycleFrise etape="CLOTUREE" />);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveAttribute("title", "Préparation — CREEE / CREATION_NOUVEAU_TOURNOI");
  });

  it("n'affiche aucune case comme courante quand etape est null", () => {
    render(<PhaseCycleFrise etape={null} />);

    expect(screen.queryByText("Préparation")).not.toBeInTheDocument();
    expect(screen.queryByText("Inscriptions ouvertes")).not.toBeInTheDocument();
    expect(screen.queryByText("Clôturée")).not.toBeInTheDocument();
    expect(screen.queryByText("Tournoi démarré")).not.toBeInTheDocument();
  });
});
