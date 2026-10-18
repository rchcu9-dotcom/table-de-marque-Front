// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

// docs/specs/-recherche-insensible-aux-accents-contexte-la-recherche-actu.md — CA10
// Une seule implémentation de la recherche sans accent : les pages passent toutes par
// utils/recherche.ts et aucune ne compare plus une saisie après un simple toLowerCase().

const testDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(testDir, "../../src");

function listerSources(dossier: string): string[] {
  return readdirSync(dossier).flatMap((entree) => {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) {
      return entree === "__tests__" ? [] : listerSources(chemin);
    }
    return /\.(ts|tsx)$/.test(entree) && !/\.(test|spec)\.tsx?$/.test(entree) ? [chemin] : [];
  });
}

const lire = (fichier: string) => readFileSync(join(srcDir, fichier), "utf8");
const relatif = (chemin: string) => relative(srcDir, chemin).split("\\").join("/");

/** Les huit pages dont la recherche a été convertie, et le nombre de filtres de chacune. */
const PAGES: [fichier: string, filtres: number][] = [
  ["pages/MatchListPage.tsx", 1],
  ["pages/PlanningPage.tsx", 1],
  ["pages/ThreeVThreePage.tsx", 1],
  ["pages/ChallengePage.tsx", 3],
  ["pages/ChallengeEquipePage.tsx", 1],
  ["pages/ChallengeAtelierPage.tsx", 1],
  ["pages/ChallengeFinaleAtelierGardienPage.tsx", 1],
  ["pages/ChallengeFinaleCombiPage.tsx", 1],
];

describe("Recherche sans accent — une seule implémentation", () => {
  it("le retrait des accents (NFD) n'existe que dans trois fichiers", () => {
    const fichiers = listerSources(srcDir)
      .filter((chemin) => /\.normalize\(\s*["']NFD["']\s*\)/.test(readFileSync(chemin, "utf8")))
      .map(relatif)
      .sort();

    expect(fichiers).toEqual([
      "pages/ChallengePage.tsx", // slug du logo, pas une recherche
      "utils/presentationContent.ts", // ancres de la page de présentation
      "utils/recherche.ts",
    ]);
  });

  it("utils/recherche.ts est le seul fichier à définir normaliserRecherche", () => {
    const definitions = listerSources(srcDir)
      .filter((chemin) => /function\s+normaliserRecherche\s*\(/.test(readFileSync(chemin, "utf8")))
      .map(relatif);

    expect(definitions).toEqual(["utils/recherche.ts"]);
  });

  it.each(PAGES)("%s appelle preparerRecherche pour chacun de ses %i filtre(s)", (fichier, filtres) => {
    const source = lire(fichier);

    expect(source).toMatch(/import \{ preparerRecherche \} from ["']\.\.\/utils\/recherche["']/);
    expect(source.match(/preparerRecherche\(/g) ?? []).toHaveLength(filtres);
  });

  it.each(PAGES)("%s ne compare plus une saisie après un simple toLowerCase()", (fichier) => {
    const source = lire(fichier);

    // Formes d'avant : `search.trim().toLowerCase()`, `.includes(term)`, `.includes(q)`.
    expect(source).not.toMatch(/\b(search|searchTerm|searchQuery)\s*\.trim\(\)\s*\.toLowerCase\(\)/);
    expect(source).not.toMatch(/\.includes\(\s*(term|q|normalizedQuery)\s*\)/);
    expect(source).not.toMatch(/\bnormalizedQuery\b/);
  });

  it.each(["pages/PlanningPage.tsx", "pages/ThreeVThreePage.tsx"])(
    "%s garde sa fonction normalize pour l'équipe suivie, sans retrait d'accents",
    (fichier) => {
      const source = lire(fichier);
      const definition = source.match(/function normalize\([^)]*\)\s*\{[^}]*\}/)?.[0] ?? "";

      expect(definition).toContain("toLowerCase()");
      expect(definition).not.toContain("NFD");
      expect(definition).not.toContain("normaliserRecherche");
      // Elle ne sert plus à la recherche : uniquement à comparer avec l'équipe suivie.
      expect(source).not.toMatch(/\.map\(normalize\)/);
    },
  );

  it("les recherches déjà conformes passent par la même fonction", () => {
    expect(lire("hooks/useListControls.ts")).toMatch(/from ['"]\.\.\/utils\/recherche['"]/);
    expect(lire("pages/inscription/equipesRecherche.ts")).toMatch(
      /from ['"]\.\.\/\.\.\/utils\/recherche['"]/,
    );
  });
});
