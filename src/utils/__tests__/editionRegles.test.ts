import { describe, it, expect } from "vitest";

import * as regles from "../editionRegles";
import type { EditionEtape } from "../../api/types/inscription.types";

// Source du back lue telle quelle (absente si le front est extrait seul : test ignoré).
const SOURCE_BACK = Object.values(
  import.meta.glob<string>("../../../../back/src/inscription/domain/edition-regles.ts", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
)[0];

function tableauBack(source: string, nom: string): string[] {
  const ligne = source.split("\n").find((l) => l.includes(`export const ${nom}`));
  if (!ligne) throw new Error(`${nom} introuvable dans le back`);
  const litteral = ligne.slice(ligne.indexOf("= ["));
  return [...litteral.matchAll(/'(\w+)'/g)].map((m) => m[1]);
}

function messageBack(source: string, nom: string): string {
  const debut = source.indexOf(`export const ${nom}`);
  const suite = source.slice(debut).split(";")[0];
  const m = suite.match(/=\s*(["'])([\s\S]*)\1\s*$/);
  if (!m) throw new Error(`${nom} introuvable dans le back`);
  return m[2];
}

describe("editionRegles — miroir de edition-regles.ts du back", () => {
  it.skipIf(!SOURCE_BACK).each([
    "ETAPES_PARAMETRES_INSCRIPTION_MODIFIABLES",
    "ETAPES_FORMULE_SPORTIVE_MODIFIABLE",
  ] as const)("%s est identique au back", (nom) => {
    expect(tableauBack(SOURCE_BACK!, nom)).toEqual([...regles[nom]]);
  });

  it.skipIf(!SOURCE_BACK).each([
    "MESSAGE_INSCRIPTION_FIGEE",
    "MESSAGE_FORMULE_FIGEE",
    "MESSAGE_RETOUR_AVEC_CANDIDATURES",
  ] as const)("%s est identique au back", (nom) => {
    expect(messageBack(SOURCE_BACK!, nom)).toBe(regles[nom]);
  });
});

describe("règles par étape (spec § 2.1)", () => {
  it.each([
    ["CREEE", true, true],
    ["CREATION_NOUVEAU_TOURNOI", true, true],
    ["INSCRIPTIONS_OUVERTES", false, true],
    ["CLOTUREE", false, true],
    ["TOURNOI_DEMARRE", false, false],
  ] as const)("%s : inscription = %s, formule = %s", (etape, inscription, formule) => {
    expect(regles.parametresInscriptionModifiables(etape)).toBe(inscription);
    expect(regles.formuleSportiveModifiable(etape)).toBe(formule);
  });

  it("une étape inconnue n'est jamais supposée modifiable", () => {
    const inconnue = undefined as unknown as EditionEtape;
    expect(regles.parametresInscriptionModifiables(inconnue)).toBe(false);
    expect(regles.formuleSportiveModifiable(inconnue)).toBe(false);
  });
});
