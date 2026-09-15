import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import ActiviteCatalogueTable from "../ActiviteCatalogueTable";
import type { ActiviteCatalogue } from "../../../api/parametresSportifs";

const REPAS: ActiviteCatalogue = {
  id: 10,
  editionId: 1,
  label: "Repas",
  dureeParEquipeMin: 40,
  capaciteParallele: 4,
};

const CHALLENGE: ActiviteCatalogue = {
  id: 20,
  editionId: 1,
  label: "Challenge",
  dureeParEquipeMin: 40,
  capaciteParallele: 1,
};

describe("ActiviteCatalogueTable", () => {
  it("n'affiche aucune activité et propose d'en ajouter une quand le catalogue est vide", () => {
    render(
      <ActiviteCatalogueTable
        activites={[]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );
    expect(screen.queryByDisplayValue("Repas")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Ajouter une activité" })).toBeInTheDocument();
  });

  it("affiche un formulaire Modifier pré-rempli pour chaque activité du catalogue", () => {
    render(
      <ActiviteCatalogueTable
        activites={[REPAS, CHALLENGE]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );
    expect(screen.getByDisplayValue("Repas")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Challenge")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Modifier" })).toHaveLength(2);
  });

  it("affiche un bouton Supprimer direct pour chaque activité, sans confirmation (§2.2 de la spec)", () => {
    const onDelete = vi.fn();
    render(
      <ActiviteCatalogueTable
        activites={[REPAS]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={onDelete}
        isSaving={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(onDelete).toHaveBeenCalledWith(10);
  });

  it("appelle onUpdate avec l'id et les champs modifiés", () => {
    const onUpdate = vi.fn();
    render(
      <ActiviteCatalogueTable
        activites={[REPAS]}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );
    const form = screen.getByDisplayValue("Repas").closest("form")!;
    fireEvent.change(within(form).getByDisplayValue("40"), { target: { value: "45" } });
    fireEvent.click(within(form).getByRole("button", { name: "Modifier" }));

    expect(onUpdate).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ label: "Repas", dureeParEquipeMin: 45 }),
    );
  });

  it("révèle un formulaire Créer au clic sur + Ajouter une activité, et appelle onCreate", () => {
    const onCreate = vi.fn();
    render(
      <ActiviteCatalogueTable
        activites={[]}
        onCreate={onCreate}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter une activité" }));
    const labelInput = screen.getByLabelText(/Label/, { selector: "input" });
    fireEvent.change(labelInput, { target: { value: "Photo officielle" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer" }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ label: "Photo officielle" }),
    );
  });

  it("permet d'annuler l'ajout d'une activité", () => {
    render(
      <ActiviteCatalogueTable
        activites={[]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter une activité" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("button", { name: "+ Ajouter une activité" })).toBeInTheDocument();
  });

  it("readOnly : masque Ajouter/Supprimer/Modifier et désactive les champs", () => {
    render(
      <ActiviteCatalogueTable
        activites={[REPAS]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
        readOnly
      />,
    );
    expect(screen.queryByRole("button", { name: "+ Ajouter une activité" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Modifier" })).not.toBeInTheDocument();
    const form = screen.getByDisplayValue("Repas").closest("form")!;
    for (const champ of Array.from(form.querySelectorAll("input, select"))) {
      expect(champ).toBeDisabled();
    }
  });
});
