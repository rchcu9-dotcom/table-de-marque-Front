import { describe, it, expect } from "vitest";

import type { EquipeRef } from "../../../api/types/inscription.types";
import { filtrerEquipes, filtrerEquipesReferentiel } from "../equipesRecherche";

// docs/specs/-prise-en-compte-du-nom-court-pour-les-logos-contexte-actuel.md — CA3

const EQUIPES: EquipeRef[] = [
  { id: 1, nom: "Courbevoie", nomComplet: "Les Coqs de Courbevoie", active: true },
  { id: 2, nom: "Rennes", nomComplet: null, active: true },
  { id: 3, nom: "Orléans", active: true },
  { id: 4, nom: "Meudon", nomComplet: "Les Comètes de Meudon", active: true },
  { id: 5, nom: "Brest", nomComplet: "Les Albatros de Brest", active: false },
];

const noms = (equipes: EquipeRef[]) => equipes.map((e) => e.nom);

describe("filtrerEquipes", () => {
  it("trouve une équipe par son nom complet", () => {
    expect(noms(filtrerEquipes(EQUIPES, "coqs"))).toEqual(["Courbevoie"]);
  });

  it("trouve une équipe par son nom court", () => {
    expect(noms(filtrerEquipes(EQUIPES, "courb"))).toEqual(["Courbevoie"]);
  });

  it("ne renvoie rien quand la saisie n'est dans aucun des deux champs", () => {
    expect(filtrerEquipes(EQUIPES, "strasbourg")).toEqual([]);
  });

  it("garde trouvable par son nom une équipe sans nom complet (null ou absent)", () => {
    expect(noms(filtrerEquipes(EQUIPES, "renn"))).toEqual(["Rennes"]);
    expect(noms(filtrerEquipes(EQUIPES, "orl"))).toEqual(["Orléans"]);
  });

  it("ignore la casse, sur le nom court comme sur le nom complet", () => {
    expect(noms(filtrerEquipes(EQUIPES, "COURBEVOIE"))).toEqual(["Courbevoie"]);
    expect(noms(filtrerEquipes(EQUIPES, "LES COQS"))).toEqual(["Courbevoie"]);
  });

  it("ignore les accents, dans la saisie comme dans la donnée", () => {
    expect(noms(filtrerEquipes(EQUIPES, "orleans"))).toEqual(["Orléans"]);
    expect(noms(filtrerEquipes(EQUIPES, "cometes"))).toEqual(["Meudon"]);
    expect(noms(filtrerEquipes(EQUIPES, "rénnes"))).toEqual(["Rennes"]);
  });

  it("renvoie toutes les équipes actives pour une saisie vide ou faite d'espaces", () => {
    const actives = ["Courbevoie", "Rennes", "Orléans", "Meudon"];
    expect(noms(filtrerEquipes(EQUIPES, ""))).toEqual(actives);
    expect(noms(filtrerEquipes(EQUIPES, "   "))).toEqual(actives);
  });

  it("n'expose jamais une équipe inactive, même si la saisie lui correspond", () => {
    expect(filtrerEquipes(EQUIPES, "brest")).toEqual([]);
    expect(filtrerEquipes(EQUIPES, "albatros")).toEqual([]);
  });

  it("renvoie chaque équipe une seule fois quand nom et nom complet correspondent tous deux", () => {
    expect(noms(filtrerEquipes(EQUIPES, "meudon"))).toEqual(["Meudon"]);
  });

  // docs/specs/-correction-des-anomalies-dans-la-liste-contexte-dans-la-lis.md — CA6, CA7
  describe("cas de la spec « anomalies »", () => {
    const REFERENTIEL: EquipeRef[] = [
      { id: 10, nom: "Trois-Chêne", nomComplet: "Les Trois-Chêne", active: true },
      { id: 11, nom: "Evry-Viry", nomComplet: null, active: true },
      { id: 12, nom: "Orléans", active: true },
      { id: 13, nom: "Toulouse", nomComplet: "Les Belougas de Toulouse Blagnac", active: true },
      { id: 14, nom: "Belougas Junior", nomComplet: null, active: true },
    ];

    it("« chene » trouve Trois-Chêne (accent dans la donnée)", () => {
      expect(noms(filtrerEquipes(REFERENTIEL, "chene"))).toEqual(["Trois-Chêne"]);
    });

    it("« Évry » trouve Evry-Viry (accent dans la saisie)", () => {
      expect(noms(filtrerEquipes(REFERENTIEL, "Évry"))).toEqual(["Evry-Viry"]);
    });

    it("« orleans » trouve Orléans", () => {
      expect(noms(filtrerEquipes(REFERENTIEL, "orleans"))).toEqual(["Orléans"]);
    });

    it("BELOUGAS, belougas et Belougas donnent le même résultat, sur nom comme sur nomComplet", () => {
      const attendu = ["Toulouse", "Belougas Junior"];

      for (const saisie of ["BELOUGAS", "belougas", "Belougas", "bélougas"]) {
        expect(noms(filtrerEquipes(REFERENTIEL, saisie))).toEqual(attendu);
      }
    });

    it("ignore les espaces de bord de la saisie", () => {
      expect(noms(filtrerEquipes(REFERENTIEL, "  chene "))).toEqual(["Trois-Chêne"]);
    });
  });

  it("conserve l'ordre reçu et ne modifie pas le tableau d'origine", () => {
    const copie = JSON.parse(JSON.stringify(EQUIPES));

    expect(noms(filtrerEquipes(EQUIPES, "les"))).toEqual(["Courbevoie", "Meudon"]);
    expect(EQUIPES).toEqual(copie);
  });
});

// docs/specs/recommandations-finales-contexte-la-mise-en-place-de-la-colo.md — §2, CA2, CA3
describe("filtrerEquipesReferentiel", () => {
  it("sans saisie ni filtre, renvoie tout le référentiel, désactivées comprises", () => {
    expect(noms(filtrerEquipesReferentiel(EQUIPES, "", "toutes"))).toEqual([
      "Courbevoie",
      "Rennes",
      "Orléans",
      "Meudon",
      "Brest",
    ]);
  });

  it("restreint aux équipes actives", () => {
    expect(noms(filtrerEquipesReferentiel(EQUIPES, "", "actives"))).toEqual([
      "Courbevoie",
      "Rennes",
      "Orléans",
      "Meudon",
    ]);
  });

  it("restreint aux équipes désactivées", () => {
    expect(noms(filtrerEquipesReferentiel(EQUIPES, "", "desactivees"))).toEqual(["Brest"]);
  });

  it("cherche dans le nom court et dans le nom complet", () => {
    expect(noms(filtrerEquipesReferentiel(EQUIPES, "courb", "toutes"))).toEqual(["Courbevoie"]);
    expect(noms(filtrerEquipesReferentiel(EQUIPES, "coqs", "toutes"))).toEqual(["Courbevoie"]);
  });

  it("trouve une équipe désactivée par son nom complet — ce que filtrerEquipes ne fait pas", () => {
    expect(noms(filtrerEquipesReferentiel(EQUIPES, "albatros", "toutes"))).toEqual(["Brest"]);
    expect(filtrerEquipes(EQUIPES, "albatros")).toEqual([]);
  });

  it("ignore la casse et les accents", () => {
    expect(noms(filtrerEquipesReferentiel(EQUIPES, "ORLEANS", "toutes"))).toEqual(["Orléans"]);
    expect(noms(filtrerEquipesReferentiel(EQUIPES, "cométes", "toutes"))).toEqual(["Meudon"]);
  });

  it("combine la recherche et le filtre d'état", () => {
    expect(noms(filtrerEquipesReferentiel(EQUIPES, "les", "actives"))).toEqual([
      "Courbevoie",
      "Meudon",
    ]);
    expect(noms(filtrerEquipesReferentiel(EQUIPES, "les", "desactivees"))).toEqual(["Brest"]);
    expect(filtrerEquipesReferentiel(EQUIPES, "coqs", "desactivees")).toEqual([]);
  });

  it("ne provoque pas d'erreur sur une équipe sans nom complet", () => {
    expect(noms(filtrerEquipesReferentiel(EQUIPES, "renn", "toutes"))).toEqual(["Rennes"]);
    expect(filtrerEquipesReferentiel(EQUIPES, "null", "toutes")).toEqual([]);
    expect(filtrerEquipesReferentiel(EQUIPES, "undefined", "toutes")).toEqual([]);
  });

  it("ne renvoie rien quand la saisie n'est dans aucun des deux champs", () => {
    expect(filtrerEquipesReferentiel(EQUIPES, "strasbourg", "toutes")).toEqual([]);
  });

  it("conserve l'ordre reçu et ne modifie pas le tableau d'origine", () => {
    const copie = JSON.parse(JSON.stringify(EQUIPES));

    filtrerEquipesReferentiel(EQUIPES, "les", "toutes");

    expect(EQUIPES).toEqual(copie);
  });
});
