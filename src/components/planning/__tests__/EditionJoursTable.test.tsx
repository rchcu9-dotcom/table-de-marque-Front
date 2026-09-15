import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import EditionJoursTable from "../EditionJoursTable";
import type { EditionJour } from "../../../api/parametresSportifs";

const JOUR1: EditionJour = {
  id: 1,
  editionId: 1,
  numeroJour: 1,
  date: "2026-05-23T00:00:00.000Z",
  heureDebut: "2026-05-23T09:00:00.000Z",
  heureFin: "2026-05-23T21:30:00.000Z",
  typeJournee: "5V5",
};

const JOUR2: EditionJour = {
  ...JOUR1,
  id: 2,
  numeroJour: 2,
};

describe("EditionJoursTable", () => {
  it("n'affiche aucun jour et propose d'en ajouter un quand la liste est vide", () => {
    render(
      <EditionJoursTable jours={[]} onUpsert={vi.fn()} onDelete={vi.fn()} isSaving={false} />,
    );
    expect(screen.queryByText(/^J1$/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Ajouter un jour" })).toBeInTheDocument();
  });

  it("affiche un formulaire Modifier pour chaque jour déjà configuré", () => {
    render(
      <EditionJoursTable jours={[JOUR1, JOUR2]} onUpsert={vi.fn()} onDelete={vi.fn()} isSaving={false} />,
    );
    expect(screen.getByText("J1")).toBeInTheDocument();
    expect(screen.getByText("J2")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Modifier" })).toHaveLength(2);
  });

  it("affiche le bouton Supprimer pour chaque jour configuré", () => {
    render(
      <EditionJoursTable jours={[JOUR1, JOUR2]} onUpsert={vi.fn()} onDelete={vi.fn()} isSaving={false} />,
    );
    expect(screen.getAllByRole("button", { name: "Supprimer" })).toHaveLength(2);
  });

  it("révèle un formulaire Créer pour le prochain numéro de jour au clic sur Ajouter un jour", () => {
    render(
      <EditionJoursTable jours={[JOUR1]} onUpsert={vi.fn()} onDelete={vi.fn()} isSaving={false} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter un jour" }));
    expect(screen.getByText("J2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer" })).toBeInTheDocument();
  });

  it("appelle onUpsert avec les champs saisis pour un nouveau jour ajouté", () => {
    const onUpsert = vi.fn();
    render(
      <EditionJoursTable jours={[]} onUpsert={onUpsert} onDelete={vi.fn()} isSaving={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter un jour" }));
    const ligneJ1 = screen.getByText("J1").closest("form")!;
    const dateInput = within(ligneJ1).getByLabelText(/Date/, { selector: "input" });
    fireEvent.change(dateInput, { target: { value: "2026-05-23" } });
    fireEvent.click(within(ligneJ1).getByRole("button", { name: "Créer" }));

    expect(onUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ numeroJour: 1, typeJournee: "5V5" }),
    );
  });

  it("permet d'annuler l'ajout d'un jour", () => {
    render(
      <EditionJoursTable jours={[]} onUpsert={vi.fn()} onDelete={vi.fn()} isSaving={false} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter un jour" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("button", { name: "+ Ajouter un jour" })).toBeInTheDocument();
  });

  it("appelle onDelete avec le numéro de jour au clic sur Supprimer", () => {
    const onDelete = vi.fn();
    render(
      <EditionJoursTable jours={[JOUR1]} onUpsert={vi.fn()} onDelete={onDelete} isSaving={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("readOnly : masque Ajouter/Supprimer/Modifier et désactive les champs", () => {
    render(
      <EditionJoursTable
        jours={[JOUR1]}
        onUpsert={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
        readOnly
      />,
    );
    expect(screen.queryByRole("button", { name: "+ Ajouter un jour" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Modifier" })).not.toBeInTheDocument();
    const ligneJ1 = screen.getByText("J1").closest("form")!;
    const champs = Array.from(ligneJ1.querySelectorAll("input, select"));
    expect(champs.length).toBeGreaterThan(0);
    for (const champ of champs) {
      expect(champ).toBeDisabled();
    }
  });
});
