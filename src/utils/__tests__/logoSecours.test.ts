import { describe, it, expect } from "vitest";
import { nomPourLogoDeSecours } from "../logoSecours";

// docs/specs/-impact-sur-les-pages-publiques-contexte-les-pages-publiques.md — §2, CA4
// Le logo de secours est toujours calculé sur un nom court.

describe("nomPourLogoDeSecours", () => {
  it("renvoie l'identifiant de l'équipe publique quand elle est connue", () => {
    expect(nomPourLogoDeSecours({ id: "rennes" }, null)).toBe("rennes");
  });

  it("préfère l'identifiant de l'équipe au nom renvoyé par l'API", () => {
    expect(nomPourLogoDeSecours({ id: "rennes" }, "Rennes Cormorans Hockey Club")).toBe("rennes");
  });

  it("ne lit jamais le nom d'affichage de l'équipe, même s'il est fourni", () => {
    const equipe = { id: "rennes", name: "Rennes Cormorans Hockey Club", logoUrl: null };

    expect(nomPourLogoDeSecours(equipe, undefined)).toBe("rennes");
  });

  it("base réelle : équipe introuvable, le nom court de l'API sert de source", () => {
    // teamId vaut « 7 » en base réelle : la recherche de l'équipe échoue toujours.
    expect(nomPourLogoDeSecours(undefined, "Courbevoie")).toBe("Courbevoie");
    expect(nomPourLogoDeSecours(null, "Le Havre")).toBe("Le Havre");
  });

  it.each([
    [undefined, undefined],
    [null, null],
    [undefined, ""],
    [undefined, "   "],
    [{ id: "" }, null],
    [{ id: "   " }, "  "],
  ])("renvoie null quand rien n'est exploitable (%j, %j)", (equipe, nom) => {
    expect(nomPourLogoDeSecours(equipe, nom)).toBeNull();
  });

  it("retombe sur le nom de l'API quand l'identifiant de l'équipe est vide", () => {
    expect(nomPourLogoDeSecours({ id: "  " }, "Courbevoie")).toBe("Courbevoie");
  });

  it("retire les espaces de bord, sans toucher à la casse ni aux accents", () => {
    expect(nomPourLogoDeSecours({ id: "  Orléans " }, null)).toBe("Orléans");
    expect(nomPourLogoDeSecours(undefined, "  Évry-Viry ")).toBe("Évry-Viry");
  });
});
