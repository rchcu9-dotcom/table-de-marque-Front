import { describe, it, expect } from "vitest";
import { getSubthemeHeadline } from "../presentationSubtheme";
import type { ArticlePresentation } from "../../api/presentation";

function article(overrides: Partial<ArticlePresentation> = {}): ArticlePresentation {
  return {
    groupe: "Présentation",
    groupeEn: "Presentation",
    surtitre: "",
    surtitreEn: "",
    titre: "Informations",
    titreEn: "Information",
    titreAccroche: "",
    titreAccrocheEn: "",
    description: "",
    descriptionEn: "",
    descriptionCourte: "",
    descriptionCourteEn: "",
    faits: "",
    faitsEn: "",
    imageUrl: null,
    lienUrl: null,
    lieu: null,
    mapsQuery: null,
    ...overrides,
  };
}

describe("getSubthemeHeadline", () => {
  it("prefers the punchy title (titreAccroche)", () => {
    expect(getSubthemeHeadline(article({ titreAccroche: "Cap sur {{ville}}" }), "fr", { ville: "Cergy" })).toBe(
      "Cap sur Cergy",
    );
  });

  it("falls back to titre when titreAccroche is empty", () => {
    expect(getSubthemeHeadline(article(), "fr", {})).toBe("Informations");
  });

  it("uses the English fields in EN, falling back to French when missing", () => {
    expect(getSubthemeHeadline(article({ titreAccroche: "Accroche", titreAccrocheEn: "Hook" }), "en", {})).toBe(
      "Hook",
    );
    expect(getSubthemeHeadline(article(), "en", {})).toBe("Information");
    expect(getSubthemeHeadline(article({ titreEn: "" }), "en", {})).toBe("Informations");
  });
});
