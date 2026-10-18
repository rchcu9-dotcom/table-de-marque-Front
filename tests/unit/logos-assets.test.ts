// @vitest-environment node
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

// docs/specs/-nettoyage-des-fichiers-de-logo-contexte-la-gestion-des-fich.md
// Garde permanente du dossier des logos : l'URL d'un logo est `<base>/<slug du nom>.png`,
// donc un fichier qui n'est pas un `.png` nommé comme un slug ne peut pas être servi.

const testDir = dirname(fileURLToPath(import.meta.url));
const logosDir = resolve(testDir, "../../public/assets/logos");

const fichiers = readdirSync(logosDir).sort();

const empreinte = (fichier: string) =>
  createHash("sha256").update(readFileSync(join(logosDir, fichier))).digest("hex");

function groupesIdentiques(): string[][] {
  const parEmpreinte = new Map<string, string[]>();
  for (const fichier of fichiers) {
    const cle = empreinte(fichier);
    parEmpreinte.set(cle, [...(parEmpreinte.get(cle) ?? []), fichier]);
  }
  return [...parEmpreinte.values()].filter((groupe) => groupe.length > 1);
}

// Les 30 fichiers « conservés sans changement » de la spec (§2) : équipes de staging,
// du seed 2026 et des mocks.
const CONSERVES = [
  "amical-1", "amical-2", "angers", "anglet", "brest", "caen", "champigny", "cholet",
  "compiegne", "courbevoie", "dammarie", "dammarie-cergy", "dunkerque", "evry-viry", "gap",
  "la-roche", "le-havre", "les-volants", "ligue-idf", "meudon", "meyrin", "nantes",
  "neuilly", "orleans", "poitiers", "rennes", "rouen", "st-brieuc", "tours",
  "valenciennes",
].map((slug) => `${slug}.png`);

// Lot A1 (supprimé) : noms qu'aucun nom d'équipe ne produit avec le slug actuel.
const LOT_A1 = ["compigne.png", "orlans.png", "orleans-hexa.svg"];

// Lot A2 (en attente des noms d'équipe de prod) : doublons connus, tolérés jusque-là.
const LOT_A2 = [
  "amicale-1.png",
  "amicale-2.png",
  "fililedefrance.png",
  "filledefrance.png",
  "fillesdefrance.png",
];

describe("Dossier des logos d'équipe", () => {
  it("ne contient que des fichiers .png (seule extension construite par le back)", () => {
    expect(fichiers.filter((f) => !f.endsWith(".png"))).toEqual([]);
  });

  it("ne contient que des noms en forme de slug (minuscules, chiffres, tirets)", () => {
    expect(fichiers.filter((f) => !/^[a-z0-9]+(-[a-z0-9]+)*\.png$/.test(f))).toEqual([]);
  });

  it("contient toujours les 30 logos des équipes connues (CA3, CA6)", () => {
    expect(CONSERVES).toHaveLength(30);
    expect(CONSERVES.filter((f) => !fichiers.includes(f))).toEqual([]);
  });

  it("ne contient aucun fichier vide", () => {
    expect(fichiers.filter((f) => readFileSync(join(logosDir, f)).length === 0)).toEqual([]);
  });

  it("lot A1 : les anciens slugs et le SVG ont disparu (CA1)", () => {
    expect(LOT_A1.filter((f) => fichiers.includes(f))).toEqual([]);
  });

  it("n'a pas grossi : au plus les 45 fichiers restant après le lot A1 (CA8)", () => {
    expect(fichiers.length).toBeLessThanOrEqual(45);
  });

  it("aucun fichier identique à un autre, hors doublons du lot A2 en attente (CA5)", () => {
    // Tout groupe de fichiers identiques doit contenir au moins un fichier du lot A2 :
    // un nouveau doublon, lui, fait échouer ce test.
    const inattendus = groupesIdentiques().filter(
      (groupe) => !groupe.some((f) => LOT_A2.includes(f)),
    );

    expect(inattendus).toEqual([]);
  });

  // À activer quand le lot A2 sera exécuté (noms d'équipe de prod fournis) : il reste
  // aujourd'hui 4 groupes — amical-N/amicale-N, fililedefrance/ligue-idf,
  // filledefrance/fillesdefrance.
  it.todo("aucune empreinte en double dans le dossier (CA5) — après le lot A2");
});
