import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import FormatGrapheCanvas from "../FormatGrapheCanvas";
import type { FormatGraphe } from "../../../api/formatGraphe";

function noop() {
  /* no-op */
}

const BASE_HANDLERS = {
  onModifierPhaseNom: noop,
  onSupprimerPhase: noop,
  onCreerPhase: noop,
  onCreerGroupe: noop,
  onModifierGroupeNom: noop,
  onSupprimerGroupe: noop,
  onAjouterPlace: noop,
  onSupprimerPlace: noop,
  onDefinirLien: noop,
  onEliminer: noop,
  onReinitialiserLien: noop,
  onGenererPreset: noop,
  isLoading: false,
};

const GRAPHE_VIDE: FormatGraphe = {
  editionId: 1,
  phases: [],
  groupes: [],
  liens: [],
  modifieManuellement: false,
  genereDepuisPreset: null,
};

const GRAPHE_HAUTE_BASSE: FormatGraphe = {
  editionId: 1,
  phases: [
    { id: 1, editionId: 1, nom: "Demi-finales", ordre: 1, joursIds: [] },
    { id: 2, editionId: 1, nom: "Finales", ordre: 2, joursIds: [] },
  ],
  groupes: [
    {
      id: 10,
      phaseId: 1,
      nom: "Demi 1",
      ordre: 1,
      places: [
        { id: 100, groupeId: 10, position: 1, origine: "ALIAS", aliasLabel: "Équipe A", lienEntrantId: null },
        { id: 101, groupeId: 10, position: 2, origine: "ALIAS", aliasLabel: "Équipe B", lienEntrantId: null },
      ],
      liens: [],
    },
    {
      id: 20,
      phaseId: 2,
      nom: "Finale",
      ordre: 1,
      places: [
        { id: 200, groupeId: 20, position: 1, origine: "LIEE", aliasLabel: null, lienEntrantId: 1000 },
      ],
      liens: [],
    },
    {
      id: 21,
      phaseId: 2,
      nom: "Petite finale",
      ordre: 2,
      places: [],
      liens: [],
    },
  ],
  // Les FormatLien vivent au niveau du graphe (PhaseColumn les recalcule par
  // groupe via graphe.liens.filter(l => l.groupeSourceId === g.id), le champ
  // `liens` porté par chaque FormatGroupe côté type API n'est pas utilisé par
  // le rendu).
  liens: [
    { id: 1000, groupeSourceId: 10, rangSource: 1, etat: "LIE", groupeCibleId: 20, placeCibleId: 200 },
    { id: 1001, groupeSourceId: 10, rangSource: 2, etat: "NON_DEFINI", groupeCibleId: null, placeCibleId: null },
  ],
  modifieManuellement: true,
  genereDepuisPreset: "ELIMINATION_DIRECTE",
};

const GRAPHE_TROIS_PHASES: FormatGraphe = {
  editionId: 1,
  phases: [
    { id: 1, editionId: 1, nom: "Brassage", ordre: 1, joursIds: [] },
    { id: 2, editionId: 1, nom: "Qualification", ordre: 2, joursIds: [] },
    { id: 3, editionId: 1, nom: "Finales", ordre: 3, joursIds: [] },
  ],
  groupes: [
    {
      id: 10,
      phaseId: 1,
      nom: "Poule Brassage",
      ordre: 1,
      places: [
        { id: 100, groupeId: 10, position: 1, origine: "ALIAS", aliasLabel: "Équipe A", lienEntrantId: null },
      ],
      liens: [],
    },
    {
      id: 20,
      phaseId: 2,
      nom: "Poule Qualification",
      ordre: 1,
      places: [
        { id: 200, groupeId: 20, position: 1, origine: "LIEE", aliasLabel: null, lienEntrantId: 1000 },
      ],
      liens: [],
    },
    {
      id: 30,
      phaseId: 3,
      nom: "Finale",
      ordre: 1,
      places: [],
      liens: [],
    },
  ],
  liens: [
    { id: 1000, groupeSourceId: 10, rangSource: 1, etat: "LIE", groupeCibleId: 20, placeCibleId: 200 },
    { id: 1001, groupeSourceId: 20, rangSource: 1, etat: "NON_DEFINI", groupeCibleId: null, placeCibleId: null },
  ],
  modifieManuellement: true,
  genereDepuisPreset: null,
};

describe("FormatGrapheCanvas", () => {
  it("affiche un message quand aucune phase n'est définie", () => {
    render(<FormatGrapheCanvas graphe={GRAPHE_VIDE} {...BASE_HANDLERS} />);
    expect(
      screen.getByText("Aucune phase definie. Creez une phase ou generez un preset."),
    ).toBeInTheDocument();
  });

  it("affiche les phases, groupes et places du graphe", () => {
    render(<FormatGrapheCanvas graphe={GRAPHE_HAUTE_BASSE} {...BASE_HANDLERS} />);

    expect(screen.getByText("Demi-finales")).toBeInTheDocument();
    expect(screen.getByText("Finales")).toBeInTheDocument();
    expect(screen.getByText("Demi 1")).toBeInTheDocument();
    expect(screen.getByText("Équipe A")).toBeInTheDocument();
    expect(screen.getByText("Équipe B")).toBeInTheDocument();
  });

  it("affiche le badge 'Modifie manuellement' et le preset d'origine", () => {
    render(<FormatGrapheCanvas graphe={GRAPHE_HAUTE_BASSE} {...BASE_HANDLERS} />);

    expect(screen.getByText("Modifie manuellement")).toBeInTheDocument();
    expect(screen.getByText("Preset : ELIMINATION_DIRECTE")).toBeInTheDocument();
  });

  it("affiche l'état LIE avec le nom du groupe cible et l'état NON_DEFINI pour un rang non résolu", () => {
    render(<FormatGrapheCanvas graphe={GRAPHE_HAUTE_BASSE} {...BASE_HANDLERS} />);

    expect(screen.getByText("Lie → Finale")).toBeInTheDocument();
    expect(screen.getByText("Non defini")).toBeInTheDocument();
  });

  it("appelle onCreerPhase avec le nom saisi puis vide le champ", () => {
    const onCreerPhase = vi.fn();
    render(
      <FormatGrapheCanvas graphe={GRAPHE_VIDE} {...BASE_HANDLERS} onCreerPhase={onCreerPhase} />,
    );

    const input = screen.getByPlaceholderText("Nom de la nouvelle phase (ex : Brassage)");
    fireEvent.change(input, { target: { value: "Brassage" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Phase" }));

    expect(onCreerPhase).toHaveBeenCalledWith("Brassage");
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("appelle onAjouterPlace avec le groupeId, sans prompt côté canevas (une seule invite, côté page)", () => {
    const onAjouterPlace = vi.fn();
    const promptSpy = vi.spyOn(window, "prompt");
    render(
      <FormatGrapheCanvas
        graphe={GRAPHE_HAUTE_BASSE}
        {...BASE_HANDLERS}
        onAjouterPlace={onAjouterPlace}
      />,
    );

    fireEvent.click(screen.getAllByText("+ Ajouter une place")[0]);

    expect(onAjouterPlace).toHaveBeenCalledWith(10);
    // Le canevas ne doit plus déclencher son propre prompt (corrigé lors de
    // la passe QA du 2026-09-08) : le prompt unique vit côté page appelante.
    expect(promptSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it("ouvre le panneau preset et appelle onGenererPreset avec les paramètres saisis", () => {
    const onGenererPreset = vi.fn();
    render(
      <FormatGrapheCanvas
        graphe={GRAPHE_VIDE}
        {...BASE_HANDLERS}
        onGenererPreset={onGenererPreset}
      />,
    );

    fireEvent.click(screen.getByText("Generer depuis un preset"));
    fireEvent.click(screen.getByText("Generer le graphe"));

    expect(onGenererPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: "ELIMINATION_DIRECTE",
        nbPoules: 2,
        nbEquipesParPoule: 4,
        nbEquipesQualifieesParPoule: 2,
        forcer: false,
      }),
    );
  });

  it("propose de forcer l'écrasement uniquement quand le graphe a été modifié manuellement", () => {
    render(
      <FormatGrapheCanvas graphe={GRAPHE_HAUTE_BASSE} {...BASE_HANDLERS} />,
    );
    fireEvent.click(screen.getByText("Generer depuis un preset"));

    expect(screen.getByText("Ecraser les modifications manuelles")).toBeInTheDocument();
  });

  it("appelle onDefinirLien avec le rang source et le groupe cible choisi", () => {
    const onDefinirLien = vi.fn();
    render(
      <FormatGrapheCanvas
        graphe={GRAPHE_HAUTE_BASSE}
        {...BASE_HANDLERS}
        onDefinirLien={onDefinirLien}
      />,
    );

    // La place de position 2 (rang NON_DEFINI) est la seconde ligne du groupe
    const select = screen.getAllByDisplayValue("Lier vers…")[1];
    fireEvent.change(select, { target: { value: "21" } });

    expect(onDefinirLien).toHaveBeenCalledWith(10, 2, 21);
  });

  it("ne propose que les groupes de la phase N+1 dans le picker 'Lien vers', pas ceux des phases précédentes", () => {
    render(<FormatGrapheCanvas graphe={GRAPHE_TROIS_PHASES} {...BASE_HANDLERS} />);

    // Deux pickers affichent "Lier vers…" comme valeur par défaut (non
    // contrôlée) : celui du rang LIE de "Poule Brassage" (phase 1), puis
    // celui du rang NON_DEFINI de "Poule Qualification" (phase 2). Ce
    // second picker ne doit proposer que les groupes de la phase 3
    // (Finales), jamais ceux de la phase 1 (Brassage).
    const select = screen.getAllByDisplayValue("Lier vers…")[1];
    const options = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);

    expect(options).toContain("Finale");
    expect(options).not.toContain("Poule Brassage");
  });

  it("appelle onEliminer pour le rang non résolu", () => {
    const onEliminer = vi.fn();
    render(
      <FormatGrapheCanvas
        graphe={GRAPHE_HAUTE_BASSE}
        {...BASE_HANDLERS}
        onEliminer={onEliminer}
      />,
    );

    // Rang 1 (LIE) et rang 2 (NON_DEFINI) affichent chacun un bouton Eliminer ;
    // le second correspond au rang 2 non résolu.
    fireEvent.click(screen.getAllByText("Eliminer")[1]);

    expect(onEliminer).toHaveBeenCalledWith(10, 2);
  });

  it("affiche les badges Vainqueur/Perdant pour un groupe MATCH UNIQUE (2 places)", () => {
    render(<FormatGrapheCanvas graphe={GRAPHE_HAUTE_BASSE} {...BASE_HANDLERS} />);

    expect(screen.getByText("Vainqueur")).toBeInTheDocument();
    expect(screen.getByText("Perdant")).toBeInTheDocument();
  });

  it("appelle onReinitialiserLien pour un rang déjà LIE", () => {
    const onReinitialiserLien = vi.fn();
    render(
      <FormatGrapheCanvas
        graphe={GRAPHE_HAUTE_BASSE}
        {...BASE_HANDLERS}
        onReinitialiserLien={onReinitialiserLien}
      />,
    );

    fireEvent.click(screen.getAllByText("Reinitialiser")[0]);

    expect(onReinitialiserLien).toHaveBeenCalledWith(10, 1);
  });
});
