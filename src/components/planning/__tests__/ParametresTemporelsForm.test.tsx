import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import ParametresTemporelsForm from "../ParametresTemporelsForm";
import type { ParametresSportifs } from "../../../api/parametresSportifs";

const PARAMETRES: ParametresSportifs = {
  editionId: 1,
  dureeSurfacageMin: 20,
  dureeMatchPouleMin: 27,
  dureeMatchFinalMin: 33,
  dureeInterMatchMin: null,
  delaiMinActivite: null,
  nbPatinoires: null,
  nbPoules: null,
  nbEquipesParPoule: null,
  nbEquipesQualifieesParPoule: null,
  formatPhaseFinale: null,
  reglesTieBreak: null,
  nbPlacesMax: 16,
};

describe("ParametresTemporelsForm", () => {
  it("pré-remplit les champs avec les valeurs des paramètres fournis", () => {
    render(<ParametresTemporelsForm parametres={PARAMETRES} onSave={vi.fn()} isSaving={false} />);
    expect(screen.getByDisplayValue("20")).toBeInTheDocument();
    expect(screen.getByDisplayValue("27")).toBeInTheDocument();
    expect(screen.getByDisplayValue("33")).toBeInTheDocument();
  });

  it("soumet les valeurs modifiées, avec null pour les champs optionnels laissés vides", () => {
    const onSave = vi.fn();
    render(<ParametresTemporelsForm parametres={PARAMETRES} onSave={onSave} isSaving={false} />);

    fireEvent.change(screen.getByDisplayValue("27"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        dureeMatchPouleMin: 30,
        dureeInterMatchMin: null,
        nbPatinoires: null,
      }),
    );
  });

  it("transmet un battement inter-match saisi comme nombre", () => {
    const onSave = vi.fn();
    render(<ParametresTemporelsForm parametres={PARAMETRES} onSave={onSave} isSaving={false} />);

    fireEvent.change(screen.getByPlaceholderText("défaut : 0"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dureeInterMatchMin: 5 }));
  });

  it("désactive le bouton d'enregistrement pendant la sauvegarde", () => {
    render(<ParametresTemporelsForm parametres={PARAMETRES} onSave={vi.fn()} isSaving={true} />);
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  });

  it("readOnly : masque le bouton Enregistrer et désactive tous les champs", () => {
    render(
      <ParametresTemporelsForm parametres={PARAMETRES} onSave={vi.fn()} isSaving={false} readOnly />,
    );
    expect(screen.queryByRole("button", { name: "Enregistrer" })).not.toBeInTheDocument();
    for (const input of screen.getAllByRole("spinbutton")) {
      expect(input).toBeDisabled();
    }
  });
});
