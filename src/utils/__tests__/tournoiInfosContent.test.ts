import { describe, it, expect } from "vitest";
import type { Edition } from "../../api/types/inscription.types";
import {
  LONG_ARTICLE_THRESHOLD,
  buildTournoiInfosTitle,
  isLongArticle,
  isSameText,
  parseContentLang,
  selectTournoiInfosGroupes,
  splitParagraphs,
} from "../tournoiInfosContent";
import { makeArticle, makeGroupe } from "../../../tests/fixtures/tournoiInfos.fixture";

describe("parseContentLang", () => {
  it.each([
    ["en", "en"],
    ["EN", "en"],
    [" en ", "en"],
    ["fr", "fr"],
    ["xx", "fr"],
    ["", "fr"],
    [null, "fr"],
  ] as const)("%j → %s", (raw, expected) => {
    expect(parseContentLang(raw)).toBe(expected);
  });
});

describe("selectTournoiInfosGroupes", () => {
  it("exclut le chapitre Médias (FR ou EN, accents et casse ignorés)", () => {
    const groupes = [
      makeGroupe("Présentation", [makeArticle({ titre: "Résumé" })]),
      makeGroupe("Médias", [makeArticle({ titre: "Photos" })]),
      makeGroupe("MEDIA", [makeArticle({ titre: "Vidéos" })]),
    ];

    expect(selectTournoiInfosGroupes(groupes).map((g) => g.nom)).toEqual(["Présentation"]);
  });

  it("exclut les articles YouTube et garde les autres, dans l'ordre reçu", () => {
    const groupes = [
      makeGroupe("Présentation", [
        makeArticle({ titre: "Résumé" }),
        makeArticle({ titre: "Chaîne YouTube" }),
        makeArticle({ titre: "Lieu" }),
      ]),
    ];

    const [groupe] = selectTournoiInfosGroupes(groupes);
    expect(groupe.articles.map((a) => a.titre)).toEqual(["Résumé", "Lieu"]);
  });

  it("masque un chapitre vidé par le filtre", () => {
    const groupes = [
      makeGroupe("Vidéos", [makeArticle({ titre: "youtube live" })]),
      makeGroupe("Lieu", [makeArticle({ titre: "Le Blizz" })]),
    ];

    expect(selectTournoiInfosGroupes(groupes).map((g) => g.nom)).toEqual(["Lieu"]);
  });

  it("conserve l'ordre de l'API et ne modifie pas l'entrée", () => {
    const groupes = [
      makeGroupe("B", [makeArticle({ titre: "b" })], { ordre: 0 }),
      makeGroupe("A", [makeArticle({ titre: "a" }), makeArticle({ titre: "YouTube" })], { ordre: 1 }),
    ];

    expect(selectTournoiInfosGroupes(groupes).map((g) => g.nom)).toEqual(["B", "A"]);
    expect(groupes[1].articles).toHaveLength(2);
  });

  it("renvoie un tableau vide pour une présentation vide", () => {
    expect(selectTournoiInfosGroupes([])).toEqual([]);
  });
});

describe("splitParagraphs", () => {
  it("découpe sur les lignes vides et garde les retours simples dans le bloc", () => {
    expect(splitParagraphs("Ligne 1\nLigne 2\n\nBloc 2\r\n\r\n\n  Bloc 3  ")).toEqual([
      "Ligne 1\nLigne 2",
      "Bloc 2",
      "Bloc 3",
    ]);
  });

  it("considère une ligne faite d'espaces comme une ligne vide", () => {
    expect(splitParagraphs("A\n  \t \nB")).toEqual(["A", "B"]);
  });

  it("renvoie un tableau vide pour un texte vide ou blanc", () => {
    expect(splitParagraphs("")).toEqual([]);
    expect(splitParagraphs(" \n\n ")).toEqual([]);
  });
});

describe("isSameText", () => {
  it("ignore les différences d'espaces et de retours à la ligne", () => {
    expect(isSameText("Deux  jours\nde glace ", " Deux jours de glace")).toBe(true);
  });

  it("distingue deux textes différents", () => {
    expect(isSameText("Deux jours", "Trois jours")).toBe(false);
  });
});

describe("isLongArticle", () => {
  it(`considère long un texte de plus de ${LONG_ARTICLE_THRESHOLD} caractères`, () => {
    expect(isLongArticle("x".repeat(LONG_ARTICLE_THRESHOLD))).toBe(false);
    expect(isLongArticle("x".repeat(LONG_ARTICLE_THRESHOLD + 1))).toBe(true);
  });
});

describe("buildTournoiInfosTitle", () => {
  const edition = { nom: "Tournoi RCHC U11", annee: 2027 } as Edition;

  it("ajoute l'année au nom de l'édition (FR et EN)", () => {
    expect(buildTournoiInfosTitle(edition, "fr")).toBe("Tournoi RCHC U11 – Informations 2027");
    expect(buildTournoiInfosTitle(edition, "en")).toBe("Tournoi RCHC U11 – Information 2027");
  });

  it("ne double pas l'année si le nom la contient déjà", () => {
    expect(buildTournoiInfosTitle({ nom: "RCHC U11 2027", annee: 2027 } as Edition, "fr")).toBe(
      "RCHC U11 2027 – Informations",
    );
  });

  it("utilise un titre de repli sans édition courante", () => {
    expect(buildTournoiInfosTitle(null, "fr")).toBe("Tournoi U11 RCHC – Informations");
    expect(buildTournoiInfosTitle(null, "en")).toBe("RCHC U11 Tournament – Information");
  });

  it("utilise le titre de repli si le nom est vide", () => {
    expect(buildTournoiInfosTitle({ nom: "  ", annee: 2027 } as Edition, "fr")).toBe(
      "Tournoi U11 RCHC – Informations 2027",
    );
  });
});
