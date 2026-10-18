import { describe, it, expect } from "vitest";

import {
  TRANSITIONS_ETAPE,
  ETAPES_PILOTAGE,
  actionsPourEtape,
  etapePilotageDe,
  libelleEtape,
  outilMisEnAvant,
} from "../editionTransitions";
import type { EditionEtape } from "../../api/types/inscription.types";

const ETAPES: EditionEtape[] = [
  "CREEE",
  "CREATION_NOUVEAU_TOURNOI",
  "INSCRIPTIONS_OUVERTES",
  "CLOTUREE",
  "TOURNOI_DEMARRE",
];

// Source du back lue telle quelle (absente si le front est extrait seul : test ignoré).
const SOURCE_BACK = Object.values(
  import.meta.glob<string>("../../../../back/src/inscription/domain/edition-transitions.ts", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
)[0];

describe("TRANSITIONS_ETAPE — miroir de la table du back", () => {
  it.skipIf(!SOURCE_BACK)("est identique à la table du back", () => {
    const source = SOURCE_BACK!;
    const bloc = source.slice(source.indexOf("= {"), source.indexOf("};"));
    const back: Record<string, string[]> = {};
    for (const [, etape, cibles] of bloc.matchAll(/(\w+):\s*\[([^\]]*)\]/g)) {
      back[etape] = [...cibles.matchAll(/'(\w+)'/g)].map((m) => m[1]);
    }

    expect(back).toEqual(TRANSITIONS_ETAPE);
  });
});

describe("actionsPourEtape", () => {
  // Une action peut couvrir plusieurs cibles : « revenir » vise CREEE ou
  // CREATION_NOUVEAU_TOURNOI, l'état exact étant choisi par le back.
  const CIBLES_PAR_ACTION: Record<string, EditionEtape[]> = {
    ouvrir: ["INSCRIPTIONS_OUVERTES"],
    cloturer: ["CLOTUREE"],
    demarrer: ["TOURNOI_DEMARRE"],
    revenir: ["CREEE", "CREATION_NOUVEAU_TOURNOI"],
  };

  it.each(ETAPES)("ne propose que les transitions autorisées depuis %s", (etape) => {
    const couvertes = actionsPourEtape(etape).flatMap((a) =>
      CIBLES_PAR_ACTION[a.action].filter((c) => TRANSITIONS_ETAPE[etape].includes(c)),
    );
    expect([...couvertes].sort()).toEqual([...TRANSITIONS_ETAPE[etape]].sort());
    for (const a of actionsPourEtape(etape)) {
      expect(TRANSITIONS_ETAPE[etape]).toContain(a.cible);
    }
  });

  it("une action n'apparaît qu'une fois par étape (dédoublonnage)", () => {
    for (const etape of ETAPES) {
      const actions = actionsPourEtape(etape).map((a) => a.action);
      expect(new Set(actions).size).toBe(actions.length);
    }
  });

  it("Préparation : « Ouvrir les inscriptions », principal, sans confirmation", () => {
    for (const etape of ["CREEE", "CREATION_NOUVEAU_TOURNOI"] as const) {
      expect(actionsPourEtape(etape)).toEqual([
        {
          action: "ouvrir",
          cible: "INSCRIPTIONS_OUVERTES",
          libelle: "Ouvrir les inscriptions",
          principale: true,
          confirmation: "aucune",
        },
      ]);
    }
  });

  it("Inscriptions ouvertes : « Clôturer » (principal, simple) puis « Revenir en préparation » (secondaire, simple)", () => {
    expect(actionsPourEtape("INSCRIPTIONS_OUVERTES")).toEqual([
      expect.objectContaining({
        action: "cloturer",
        libelle: "Clôturer les inscriptions",
        principale: true,
        confirmation: "simple",
      }),
      expect.objectContaining({
        action: "revenir",
        libelle: "Revenir en préparation",
        principale: false,
        confirmation: "simple",
      }),
    ]);
  });

  it("« Revenir en préparation » n'est proposé que depuis Inscriptions ouvertes", () => {
    for (const etape of ETAPES) {
      const propose = actionsPourEtape(etape).some((a) => a.action === "revenir");
      expect(propose).toBe(etape === "INSCRIPTIONS_OUVERTES");
    }
  });

  it("Inscriptions clôturées : « Lancer le tournoi » (principal, forte) puis « Rouvrir » (secondaire, simple)", () => {
    expect(actionsPourEtape("CLOTUREE")).toEqual([
      expect.objectContaining({
        action: "demarrer",
        libelle: "Lancer le tournoi",
        principale: true,
        confirmation: "forte",
      }),
      expect.objectContaining({
        action: "ouvrir",
        libelle: "Rouvrir les inscriptions",
        principale: false,
        confirmation: "simple",
      }),
    ]);
  });

  it("Tournoi en cours : aucune transition d'étape", () => {
    expect(actionsPourEtape("TOURNOI_DEMARRE")).toEqual([]);
  });

  it("un seul bouton principal par étape", () => {
    for (const etape of ETAPES) {
      expect(actionsPourEtape(etape).filter((a) => a.principale).length).toBeLessThanOrEqual(1);
    }
  });
});

describe("libellés", () => {
  it("5 étapes de frise, libellés français", () => {
    expect(ETAPES_PILOTAGE.map((e) => e.label)).toEqual([
      "Préparation",
      "Inscriptions ouvertes",
      "Inscriptions clôturées",
      "Tournoi en cours",
      "Saison suivante",
    ]);
  });

  it.each([
    ["CREEE", "Préparation"],
    ["CREATION_NOUVEAU_TOURNOI", "Préparation"],
    ["INSCRIPTIONS_OUVERTES", "Inscriptions ouvertes"],
    ["CLOTUREE", "Inscriptions clôturées"],
    ["TOURNOI_DEMARRE", "Tournoi en cours"],
  ] as const)("%s → %s", (etape, libelle) => {
    expect(libelleEtape(etape)).toBe(libelle);
  });

  it("regroupe CREEE et CREATION_NOUVEAU_TOURNOI sous Préparation", () => {
    expect(etapePilotageDe("CREEE")).toBe("PREPARATION");
    expect(etapePilotageDe("CREATION_NOUVEAU_TOURNOI")).toBe("PREPARATION");
  });
});

describe("outilMisEnAvant", () => {
  it.each([
    ["CREEE", "PARAMETRES_INSCRIPTION"],
    ["CREATION_NOUVEAU_TOURNOI", "PARAMETRES_INSCRIPTION"],
    ["INSCRIPTIONS_OUVERTES", "PARAMETRES_SPORTIFS"],
    ["CLOTUREE", "SIMULATION_PLANNING"],
    ["TOURNOI_DEMARRE", "PRESENTATION"],
  ] as const)("%s → %s", (etape, outil) => {
    expect(outilMisEnAvant(etape)).toBe(outil);
  });
});
