import { describe, it, expect } from "vitest";
import { normaliserRecherche, preparerRecherche } from "../recherche";
import { normaliserRecherche as depuisLeHook } from "../../hooks/useListControls";

// docs/specs/-recherche-insensible-aux-accents-contexte-la-recherche-actu.md — §2, CA1 à CA6, CA11

/** Raccourci : la saisie trouve-t-elle au moins une des valeurs ? */
function trouve(saisie: string, ...valeurs: (string | number | null | undefined)[]): boolean {
  const correspond = preparerRecherche(saisie);
  if (!correspond) throw new Error(`saisie « ${saisie} » considérée comme vide`);
  return correspond(valeurs);
}

describe("normaliserRecherche", () => {
  it.each([
    ["é", "e"], ["è", "e"], ["ê", "e"], ["ë", "e"],
    ["à", "a"], ["â", "a"],
    ["î", "i"], ["ï", "i"],
    ["ô", "o"],
    ["ù", "u"], ["û", "u"], ["ü", "u"],
    ["ç", "c"],
  ])("ramène « %s » à « %s »", (accentuee, base) => {
    expect(normaliserRecherche(accentuee)).toBe(base);
  });

  it.each([
    ["É", "e"], ["È", "e"], ["Ê", "e"], ["Ë", "e"],
    ["À", "a"], ["Â", "a"], ["Î", "i"], ["Ï", "i"],
    ["Ô", "o"], ["Ù", "u"], ["Û", "u"], ["Ü", "u"], ["Ç", "c"],
  ])("ramène la majuscule accentuée « %s » à « %s »", (accentuee, base) => {
    expect(normaliserRecherche(accentuee)).toBe(base);
  });

  it("passe en minuscules et retire les espaces de bord", () => {
    expect(normaliserRecherche("  ÉVRY Côté ")).toBe("evry cote");
  });

  it("garde les espaces intérieurs, les tirets, les chiffres et la ponctuation", () => {
    expect(normaliserRecherche("Saint-Brieuc  U11 (B)")).toBe("saint-brieuc  u11 (b)");
  });

  it("donne le même résultat pour une chaîne précomposée (NFC) et décomposée (NFD)", () => {
    const nfc = "Orléans";
    const nfd = "Orléans";

    expect(nfc).not.toBe(nfd);
    expect(normaliserRecherche(nfc)).toBe("orleans");
    expect(normaliserRecherche(nfd)).toBe("orleans");
  });

  it("laisse intacte une chaîne sans accent ni majuscule", () => {
    expect(normaliserRecherche("rennes")).toBe("rennes");
    expect(normaliserRecherche("")).toBe("");
  });

  it("ne décompose pas les ligatures ni les apostrophes typographiques (hors périmètre)", () => {
    expect(normaliserRecherche("Cœur")).toBe("cœur");
    expect(normaliserRecherche("d’Angers")).toBe("d’angers");
  });

  it("est la même fonction que celle réexportée par useListControls", () => {
    expect(depuisLeHook).toBe(normaliserRecherche);
  });
});

describe("preparerRecherche — saisie vide (CA6)", () => {
  it.each([[""], ["   "], ["\t\n"], [null], [undefined]])(
    "renvoie null pour %j : rien à filtrer",
    (saisie) => {
      expect(preparerRecherche(saisie)).toBeNull();
    },
  );
});

describe("preparerRecherche — accents et casse", () => {
  it.each([
    ["cometes", "Les Comètes de Meudon"],
    ["orleans", "Orléans"],
    ["leo", "Léo"],
  ])("saisie sans accent « %s », donnée accentuée « %s » (CA1)", (saisie, donnee) => {
    expect(trouve(saisie, donnee)).toBe(true);
  });

  it.each([
    ["Évry", "Evry-Viry"],
    ["compiègne", "Compiegne"],
  ])("saisie accentuée « %s », donnée sans accent « %s » (CA2)", (saisie, donnee) => {
    expect(trouve(saisie, donnee)).toBe(true);
  });

  it("accents des deux côtés, placés différemment", () => {
    expect(trouve("évry", "Évry-Viry")).toBe(true);
    expect(trouve("orlèans", "Orléans")).toBe(true);
  });

  it("« ORLEANS », « orléans » et « Orleans » donnent les mêmes résultats (CA3)", () => {
    const donnees = ["Orléans", "Orleans U11", "Rennes", "ORLÉANS B", "Compiegne"];
    const resultats = (saisie: string) => donnees.filter((d) => trouve(saisie, d));

    expect(resultats("ORLEANS")).toEqual(["Orléans", "Orleans U11", "ORLÉANS B"]);
    expect(resultats("orléans")).toEqual(resultats("ORLEANS"));
    expect(resultats("Orleans")).toEqual(resultats("ORLEANS"));
  });

  it.each([
    ["francois", "François"],
    ["garcon", "Garçon"],
    ["FRANÇOIS", "francois"],
  ])("cédille : « %s » trouve « %s » (CA4)", (saisie, donnee) => {
    expect(trouve(saisie, donnee)).toBe(true);
  });

  it("cherche une partie du texte, pas le texte entier", () => {
    expect(trouve("etes de meu", "Les Comètes de Meudon")).toBe(true);
  });

  it("ignore les espaces autour de la saisie", () => {
    expect(trouve("  orleans  ", "Orléans")).toBe(true);
  });
});

describe("preparerRecherche — pas de résultat en trop (CA5)", () => {
  it("ne trouve rien pour une saisie sans rapport", () => {
    expect(trouve("strasbourg", "Orléans", "Rennes", "Evry-Viry")).toBe(false);
  });

  it("ne gère ni le pluriel ni les fautes de frappe", () => {
    expect(trouve("comètes", "Comete")).toBe(false);
    expect(trouve("orlaens", "Orléans")).toBe(false);
  });

  it("ne rapproche pas des lettres différentes", () => {
    expect(trouve("rannes", "Rennes")).toBe(false);
    expect(trouve("coeur", "Cœur")).toBe(false);
  });

  it("sur des données sans accent, une saisie sans accent donne le même résultat qu'un simple « contient » en minuscules", () => {
    const donnees = ["Rennes", "Meudon", "Rouen", "Le Havre", "Tours", "Nantes"];
    for (const saisie of ["re", "ou", "nn", "le h", "x", "TOURS"]) {
      const attendu = donnees.filter((d) => d.toLowerCase().includes(saisie.toLowerCase()));

      expect(donnees.filter((d) => trouve(saisie, d))).toEqual(attendu);
    }
  });
});

describe("preparerRecherche — valeurs", () => {
  it("répond vrai dès qu'une seule valeur correspond", () => {
    expect(trouve("meudon", "Rennes", "Les Comètes de Meudon", "Poule A")).toBe(true);
  });

  it("répond faux pour une liste vide", () => {
    expect(trouve("rennes")).toBe(false);
  });

  it("ignore les valeurs null et undefined sans erreur", () => {
    expect(trouve("rennes", null, undefined, "Rennes")).toBe(true);
    expect(trouve("rennes", null, undefined)).toBe(false);
  });

  it("« null » et « undefined » ne trouvent pas une valeur absente", () => {
    expect(trouve("null", null, undefined)).toBe(false);
    expect(trouve("undefined", null, undefined)).toBe(false);
    expect(trouve("nul", null)).toBe(false);
  });

  it("cherche dans les nombres comme dans du texte", () => {
    expect(trouve("12", 12)).toBe(true);
    expect(trouve("2", 12)).toBe(true);
    expect(trouve("0", 0)).toBe(true);
    expect(trouve("3", 12)).toBe(false);
  });

  it("ne modifie pas les valeurs reçues", () => {
    const valeurs = ["Orléans", "Évry"];
    const copie = [...valeurs];

    trouve("orleans", ...valeurs);

    expect(valeurs).toEqual(copie);
  });

  it("le test préparé est réutilisable d'une ligne à l'autre", () => {
    const correspond = preparerRecherche("Évry")!;

    expect(correspond(["Evry-Viry"])).toBe(true);
    expect(correspond(["Rennes"])).toBe(false);
    expect(correspond(["ÉVRY"])).toBe(true);
  });
});
