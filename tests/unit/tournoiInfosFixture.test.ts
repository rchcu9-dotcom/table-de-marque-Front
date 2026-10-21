import { describe, it, expect } from "vitest";
import { buildGroupesVolumeReel } from "../fixtures/tournoiInfos.fixture";
import { isLongArticle, selectTournoiInfosGroupes } from "../../src/utils/tournoiInfosContent";

/** Garde-fou de la fixture CA5b : elle doit rester représentative du contenu réel (seed hors Médias). */
describe("buildGroupesVolumeReel (fixture CA5b)", () => {
  const groupes = selectTournoiInfosGroupes(buildGroupesVolumeReel());
  const articles = groupes.flatMap((g) => g.articles);
  const volume = (nom: string) =>
    groupes.find((g) => g.nom === nom)!.articles.reduce((total, a) => total + a.description.length, 0);

  it("contient 3 chapitres et 22 articles une fois Médias exclu", () => {
    expect(groupes.map((g) => g.nom)).toEqual(["Présentation", "Règlement", "Challenge"]);
    expect(articles).toHaveLength(22);
  });

  it("totalise entre 15 000 et 15 600 caractères de description", () => {
    const total = articles.reduce((somme, a) => somme + a.description.length, 0);
    expect(total).toBeGreaterThanOrEqual(15_000);
    expect(total).toBeLessThanOrEqual(15_600);
  });

  it("répartit le volume comme le seed (Présentation ~2 700, Règlement ~6 200, Challenge ~6 700)", () => {
    expect(volume("Présentation")).toBeGreaterThanOrEqual(2_400);
    expect(volume("Présentation")).toBeLessThanOrEqual(3_000);
    expect(volume("Règlement")).toBeGreaterThanOrEqual(5_900);
    expect(volume("Règlement")).toBeLessThanOrEqual(6_500);
    expect(volume("Challenge")).toBeGreaterThanOrEqual(6_400);
    expect(volume("Challenge")).toBeLessThanOrEqual(7_000);
  });

  it("contient au moins un article long (data-long) et des listes ligne à ligne", () => {
    expect(articles.filter((a) => isLongArticle(a.description)).length).toBeGreaterThanOrEqual(1);
    expect(articles.some((a) => /\n- Point 1 :/.test(a.description))).toBe(true);
  });

  it("a des titres uniques", () => {
    expect(new Set(articles.map((a) => a.titre)).size).toBe(articles.length);
  });
});
