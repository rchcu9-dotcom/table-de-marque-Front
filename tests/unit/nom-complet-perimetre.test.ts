// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

// docs/specs/-mise-jour-du-parcours-dinscription-contexte-dans-le-cadre-d.md — critère 8
// Le nom complet d'une équipe ne sert qu'au parcours d'inscription et à l'admin : aucune
// page publique, ni le planning, ni la table de marque ne doit le lire.

const testDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(testDir, "../../src");

/** Seuls fichiers de front/src (hors tests) autorisés à mentionner nomComplet / equipeNomComplet. */
const AUTORISES = [
  "api/inscription.ts",
  "api/types/inscription.types.ts",
  "components/admin/AjouterEquipeReferentielPanel.tsx",
  "components/admin/EquipeReferentielEdition.tsx",
  "components/admin/EquipeReferentielLigne.tsx",
  "hooks/useEquipesReferentiel.ts",
  "pages/AdminPage.tsx",
  "pages/InscriptionPage.tsx",
  "pages/inscription/EquipeNoms.tsx",
  "pages/inscription/candidaturesListe.ts",
  "pages/inscription/equipeModification.ts",
  "pages/inscription/equipesRecherche.ts",
];

function listerSources(dossier: string): string[] {
  return readdirSync(dossier).flatMap((entree) => {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) {
      return entree === "__tests__" ? [] : listerSources(chemin);
    }
    return /\.(ts|tsx)$/.test(entree) && !/\.(test|spec)\.tsx?$/.test(entree) ? [chemin] : [];
  });
}

describe("Périmètre du nom complet dans le front", () => {
  it("n'est mentionné que par les fichiers du parcours d'inscription et de l'admin", () => {
    const trouves = listerSources(srcDir)
      .filter((chemin) => /nomComplet/i.test(readFileSync(chemin, "utf8")))
      .map((chemin) => relative(srcDir, chemin).split("\\").join("/"))
      .sort();

    // Égalité dans les deux sens : un fichier nouveau échoue, une entrée devenue inutile aussi.
    expect(trouves).toEqual([...AUTORISES].sort());
  });
});
