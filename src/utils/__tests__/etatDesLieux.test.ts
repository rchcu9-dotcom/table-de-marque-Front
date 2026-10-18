import { describe, it, expect } from "vitest";

import {
  etatCandidatures,
  parametresInscriptionRemplis,
  parametresSportifsRemplis,
} from "../etatDesLieux";
import type {
  CandidatureOrganisateur,
  Edition,
  StatutInscription,
} from "../../api/types/inscription.types";
import type { ParametresSportifs } from "../../api/parametresSportifs";

function candidature(equipeNom: string, statut: StatutInscription): CandidatureOrganisateur {
  return { equipeNom, statut } as CandidatureOrganisateur;
}

describe("etatCandidatures", () => {
  it("compte candidatures (hors refusées), retenues, paiements attendus et dossiers complets", () => {
    const etat = etatCandidatures([
      candidature("A", "CANDIDATE"),
      candidature("B", "PAIEMENT_ATTENDU"),
      candidature("C", "PAIEMENT_ATTENDU"),
      candidature("D", "VALIDEE"),
      candidature("E", "DOSSIER_EN_COURS"),
      candidature("F", "DOSSIER_COMPLET"),
      candidature("G", "REFUSEE"),
      candidature("H", "LISTE_ATTENTE"),
    ]);

    expect(etat).toEqual({
      total: 8,
      candidatures: 7,
      retenues: 3,
      paiementsAttendus: 2,
      dossiersComplets: 1,
      dossiersIncomplets: ["D", "E"],
    });
  });

  it("total compte aussi les refusées : critère du back pour « Revenir en préparation »", () => {
    const etat = etatCandidatures([candidature("G", "REFUSEE")]);
    expect(etat.total).toBe(1);
    expect(etat.candidatures).toBe(0);
  });

  it("liste vide → tout à zéro", () => {
    expect(etatCandidatures([])).toEqual({
      total: 0,
      candidatures: 0,
      retenues: 0,
      paiementsAttendus: 0,
      dossiersComplets: 0,
      dossiersIncomplets: [],
    });
  });
});

describe("parametresInscriptionRemplis", () => {
  const base = {
    nom: "RCHC",
    categorie: "U11",
    dateDebut: "2027-05-22",
    nbPlacesMax: 16,
    anneesAge: [2016],
  } as Edition;

  it("vrai quand nom, catégorie, date, capacité et années d'âge sont renseignés", () => {
    expect(parametresInscriptionRemplis(base)).toBe(true);
  });

  it.each([
    ["nom vide", { nom: " " }],
    ["catégorie vide", { categorie: "" }],
    ["sans date", { dateDebut: "" }],
    ["capacité nulle", { nbPlacesMax: 0 }],
    ["sans année d'âge", { anneesAge: [] }],
  ])("faux : %s", (_, patch) => {
    expect(parametresInscriptionRemplis({ ...base, ...patch } as Edition)).toBe(false);
  });
});

describe("parametresSportifsRemplis", () => {
  const base = { nbPatinoires: 2, nbPoules: 4, nbEquipesParPoule: 4 } as ParametresSportifs;

  it("vrai quand patinoires, poules et équipes par poule sont renseignés", () => {
    expect(parametresSportifsRemplis(base)).toBe(true);
  });

  it.each(["nbPatinoires", "nbPoules", "nbEquipesParPoule"] as const)("faux sans %s", (champ) => {
    expect(parametresSportifsRemplis({ ...base, [champ]: null })).toBe(false);
  });
});
