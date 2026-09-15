import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import FormatCompetitionForm from "../FormatCompetitionForm";
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

describe("FormatCompetitionForm", () => {
  it("affiche l'ordre de tie-break par défaut quand reglesTieBreak est absent", () => {
    render(<FormatCompetitionForm parametres={PARAMETRES} onSave={vi.fn()} isSaving={false} />);
    expect(screen.getByText(/1\. Points/)).toBeInTheDocument();
    expect(screen.getByText(/4\. Confrontation directe/)).toBeInTheDocument();
  });

  it("n'affiche plus les champs nombre de poules, équipes par poule, qualifiés par poule et format phase finale", () => {
    render(<FormatCompetitionForm parametres={PARAMETRES} onSave={vi.fn()} isSaving={false} />);
    expect(screen.queryByText("Nombre de poules")).not.toBeInTheDocument();
    expect(screen.queryByText("Équipes par poule")).not.toBeInTheDocument();
    expect(screen.queryByText("Qualifiés par poule")).not.toBeInTheDocument();
    expect(screen.queryByText("Format phase finale")).not.toBeInTheDocument();
  });

  it("affiche le lien vers le constructeur graphique au-dessus des critères de départage", () => {
    render(<FormatCompetitionForm parametres={PARAMETRES} onSave={vi.fn()} isSaving={false} />);
    const lien = screen.getByRole("link", {
      name: "Constructeur graphique du format de competition →",
    });
    expect(lien).toHaveAttribute("href", "/admin/format-competition");

    const positions = Array.from(
      document.querySelectorAll("a, p"),
    ).map((el) => el.textContent);
    const lienIndex = positions.findIndex((t) => t?.includes("Constructeur graphique"));
    const critereIndex = positions.findIndex((t) => t?.includes("Ordre des critères de départage"));
    expect(lienIndex).toBeGreaterThanOrEqual(0);
    expect(critereIndex).toBeGreaterThan(lienIndex);
  });

  it("soumet uniquement reglesTieBreak", () => {
    const onSave = vi.fn();
    render(<FormatCompetitionForm parametres={PARAMETRES} onSave={onSave} isSaving={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(onSave).toHaveBeenCalledWith({
      reglesTieBreak: [
        "points",
        "difference_buts",
        "buts_marques",
        "confrontation_directe",
      ],
    });
  });

  it("remonte les critères de tie-break dans l'ordre après un clic sur ↑", () => {
    const onSave = vi.fn();
    render(<FormatCompetitionForm parametres={PARAMETRES} onSave={onSave} isSaving={false} />);

    const monterBoutons = screen.getAllByRole("button", { name: "↑" });
    // Le 2e critère ("Différence de buts") remonte en 1ère position.
    fireEvent.click(monterBoutons[1]);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        reglesTieBreak: [
          "difference_buts",
          "points",
          "buts_marques",
          "confrontation_directe",
        ],
      }),
    );
  });

  it("désactive le bouton ↑ pour le premier critère et ↓ pour le dernier", () => {
    render(<FormatCompetitionForm parametres={PARAMETRES} onSave={vi.fn()} isSaving={false} />);
    const monter = screen.getAllByRole("button", { name: "↑" });
    const descendre = screen.getAllByRole("button", { name: "↓" });
    expect(monter[0]).toBeDisabled();
    expect(descendre[descendre.length - 1]).toBeDisabled();
  });

  it("readOnly : masque Enregistrer et les boutons de réordonnancement, et propage ?edition=demarree au lien constructeur", () => {
    render(<FormatCompetitionForm parametres={PARAMETRES} onSave={vi.fn()} isSaving={false} readOnly />);
    expect(screen.queryByRole("button", { name: "Enregistrer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "↑" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "↓" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Constructeur graphique du format de competition →" }),
    ).toHaveAttribute("href", "/admin/format-competition?edition=demarree");
  });
});
