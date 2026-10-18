import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import CreneauxActiviteTable from "../CreneauxActiviteTable";
import type { ActiviteCatalogue, CreneauActivite } from "../../../api/parametresSportifs";

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

const CRENEAU_LIBRE: CreneauActivite = {
  id: 1,
  editionId: 1,
  activiteId: 10,
  date: "2026-05-23T00:00:00.000Z",
  heureDebut: "2026-05-23T12:00:00.000Z",
  dureeMin: 40,
  equipeId: null,
  equipeLabel: null,
  statut: "LIBRE",
};

const CRENEAU_CONFIRME: CreneauActivite = {
  ...CRENEAU_LIBRE,
  id: 2,
  equipeId: null,
  equipeLabel: "1er Poule A",
  statut: "CONFIRME",
};

describe("CreneauxActiviteTable", () => {
  it("n'affiche aucun créneau et propose d'en ajouter un quand la liste est vide", () => {
    render(
      <CreneauxActiviteTable
        creneaux={[]}
        activitesCatalogue={[REPAS]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );
    expect(screen.getByRole("button", { name: "+ Ajouter un créneau" })).toBeInTheDocument();
  });

  it("désactive le bouton d'ajout tant qu'aucune activité n'existe au catalogue", () => {
    render(
      <CreneauxActiviteTable
        creneaux={[]}
        activitesCatalogue={[]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );
    expect(screen.getByRole("button", { name: "+ Ajouter un créneau" })).toBeDisabled();
  });

  it("affiche un formulaire par créneau existant, trié par heure de début", () => {
    const creneauPlusTard = { ...CRENEAU_LIBRE, id: 3, heureDebut: "2026-05-23T18:00:00.000Z" };
    render(
      <CreneauxActiviteTable
        creneaux={[creneauPlusTard, CRENEAU_LIBRE]}
        activitesCatalogue={[REPAS]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );
    const toHHmm = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    const heures = screen.getAllByLabelText(/Heure/, { selector: "input" }).map(
      (el) => (el as HTMLInputElement).value,
    );
    expect(heures).toEqual([toHHmm(CRENEAU_LIBRE.heureDebut), toHHmm(creneauPlusTard.heureDebut)]);
  });

  it("affiche un badge Confirmé avec l'occupant pour un créneau déjà confirmé", () => {
    render(
      <CreneauxActiviteTable
        creneaux={[CRENEAU_CONFIRME]}
        activitesCatalogue={[REPAS]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );
    expect(screen.getByText(/Confirmé — 1er Poule A/)).toBeInTheDocument();
  });

  it("appelle onDelete avec l'id du créneau au clic sur Supprimer", () => {
    const onDelete = vi.fn();
    render(
      <CreneauxActiviteTable
        creneaux={[CRENEAU_LIBRE]}
        activitesCatalogue={[REPAS]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={onDelete}
        isSaving={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("propose de pré-remplir N créneaux identiques quand l'activité sélectionnée a une capacité parallèle > 1, et enchaîne N appels à onCreate", () => {
    const onCreate = vi.fn();
    render(
      <CreneauxActiviteTable
        creneaux={[]}
        activitesCatalogue={[REPAS]}
        onCreate={onCreate}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter un créneau" }));
    expect(
      screen.getByText(/Pré-remplir 4 créneaux identiques/),
    ).toBeInTheDocument();

    const dateInput = screen.getByLabelText(/Date/, { selector: "input" });
    fireEvent.change(dateInput, { target: { value: "2026-05-23" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer" }));

    expect(onCreate).toHaveBeenCalledTimes(4);
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ activiteId: 10 }));
  });

  it("ne propose pas de pré-remplissage pour une activité de capacité parallèle 1 (ex. Challenge)", () => {
    const onCreate = vi.fn();
    render(
      <CreneauxActiviteTable
        creneaux={[]}
        activitesCatalogue={[CHALLENGE]}
        onCreate={onCreate}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter un créneau" }));
    expect(screen.queryByText(/Pré-remplir/)).not.toBeInTheDocument();

    const dateInput = screen.getByLabelText(/Date/, { selector: "input" });
    fireEvent.change(dateInput, { target: { value: "2026-05-23" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer" }));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("appelle onUpdate avec l'id et les champs modifiés pour un créneau existant", () => {
    const onUpdate = vi.fn();
    render(
      <CreneauxActiviteTable
        creneaux={[CRENEAU_LIBRE]}
        activitesCatalogue={[REPAS]}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );

    const dureeInput = screen.getByLabelText(/Durée \(min\)/, { selector: "input" });
    const form = dureeInput.closest("form")!;
    fireEvent.change(dureeInput, { target: { value: "30" } });
    fireEvent.click(within(form).getByRole("button", { name: "Modifier" }));

    expect(onUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ dureeMin: 30 }));
  });

  it("readOnly : masque Ajouter/Supprimer/Modifier et désactive les champs", () => {
    render(
      <CreneauxActiviteTable
        creneaux={[CRENEAU_LIBRE]}
        activitesCatalogue={[REPAS]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
        readOnly
      />,
    );
    expect(screen.queryByRole("button", { name: "+ Ajouter un créneau" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cloner" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Modifier" })).not.toBeInTheDocument();
    const dureeInput = screen.getByLabelText(/Durée \(min\)/, { selector: "input" });
    const form = dureeInput.closest("form")!;
    for (const champ of Array.from(form.querySelectorAll("input, select"))) {
      expect(champ).toBeDisabled();
    }
  });

  it("Cloner appelle onCreate avec une copie exacte du créneau (activité, date, heure, durée)", () => {
    const onCreate = vi.fn();
    const creneau = { ...CRENEAU_LIBRE, activiteId: 20, dureeMin: 25, heureDebut: "2026-05-23T14:35:00.000Z" };
    render(
      <CreneauxActiviteTable
        creneaux={[creneau]}
        activitesCatalogue={[REPAS, CHALLENGE]}
        onCreate={onCreate}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cloner" }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith({
      activiteId: 20,
      date: "2026-05-23",
      heureDebut: "2026-05-23T14:35:00.000Z",
      dureeMin: 25,
    });
  });

  it("Cloner un créneau confirmé crée un créneau libre (l'équipe n'est pas recopiée)", () => {
    const onCreate = vi.fn();
    render(
      <CreneauxActiviteTable
        creneaux={[CRENEAU_CONFIRME]}
        activitesCatalogue={[REPAS]}
        onCreate={onCreate}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cloner" }));

    const payload = onCreate.mock.calls[0][0];
    expect(Object.keys(payload).sort()).toEqual(["activiteId", "date", "dureeMin", "heureDebut"]);
  });

  it("Cloner est désactivé pendant un enregistrement", () => {
    render(
      <CreneauxActiviteTable
        creneaux={[CRENEAU_LIBRE]}
        activitesCatalogue={[REPAS]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving
      />,
    );
    expect(screen.getByRole("button", { name: "Cloner" })).toBeDisabled();
  });

  it("trie par date croissante, puis par heure, sur plusieurs journées", () => {
    const j2Matin = { ...CRENEAU_LIBRE, id: 5, date: "2026-05-24T00:00:00.000Z", heureDebut: "2026-05-24T08:00:00.000Z" };
    const j1Soir = { ...CRENEAU_LIBRE, id: 6, date: "2026-05-23T00:00:00.000Z", heureDebut: "2026-05-23T18:00:00.000Z" };
    const j3 = { ...CRENEAU_LIBRE, id: 7, date: "2026-05-25T00:00:00.000Z", heureDebut: "2026-05-25T10:00:00.000Z" };
    render(
      <CreneauxActiviteTable
        creneaux={[j3, j2Matin, j1Soir, CRENEAU_LIBRE]}
        activitesCatalogue={[REPAS]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );

    const dates = screen.getAllByLabelText(/Date/, { selector: "input" }).map(
      (el) => (el as HTMLInputElement).value,
    );
    expect(dates).toEqual(["2026-05-23", "2026-05-23", "2026-05-24", "2026-05-25"]);
    const heures = screen.getAllByLabelText(/Heure/, { selector: "input" }).map(
      (el) => (el as HTMLInputElement).value,
    );
    // Même jour : l'heure la plus tôt d'abord (12:00 UTC avant 18:00 UTC).
    expect(heures[0] < heures[1]).toBe(true);
  });

  it("à date et heure égales, un clone s'affiche juste après l'original (ordre de création)", () => {
    const clone = { ...CRENEAU_LIBRE, id: 9 };
    const autre = { ...CRENEAU_LIBRE, id: 4, dureeMin: 15 };
    render(
      <CreneauxActiviteTable
        creneaux={[clone, autre, CRENEAU_LIBRE]}
        activitesCatalogue={[REPAS]}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        isSaving={false}
      />,
    );

    const durees = screen.getAllByLabelText(/Durée \(min\)/, { selector: "input" }).map(
      (el) => (el as HTMLInputElement).value,
    );
    // ids 1 (40 min), 4 (15 min), 9 (40 min)
    expect(durees).toEqual(["40", "15", "40"]);
  });
});
