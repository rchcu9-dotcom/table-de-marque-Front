import { describe, it, expect } from "vitest";
import { buildPresentationTokens, resolveTokens } from "../presentationTokens";
import type { PresentationStaticInfo } from "../../config/presentationStaticInfo";
import type { Edition } from "../../api/types/inscription.types";

const STATIC_INFO: PresentationStaticInfo = {
  ville: "Cergy",
  lieu: "Patinoire de Cergy",
  clubNom: "RCHC",
  fraisCaution: "50 €",
  formatMatch: "3x15 minutes",
};

const EDITION: Edition = {
  id: 1,
  nom: "Tournoi U11 RCHC",
  categorie: "U11",
  annee: 2026,
  etape: "INSCRIPTIONS_OUVERTES",
  dateDebut: "2026-05-09T12:00:00.000Z",
  dateFinDebut: "2026-05-09T12:00:00.000Z",
  dateFinFin: "2026-05-10T12:00:00.000Z",
  fraisInscription: 350,
  prixRepas: 12,
  nbPlacesMax: 16,
  affichagePlanningPublic: true,
  anneesAge: [2015, 2016],
};

describe("buildPresentationTokens", () => {
  it("maps static info fields directly (no backend field exists for these)", () => {
    const tokens = buildPresentationTokens(EDITION, STATIC_INFO);

    expect(tokens.ville).toBe("Cergy");
    expect(tokens.lieu).toBe("Patinoire de Cergy");
    expect(tokens.clubNom).toBe("RCHC");
    expect(tokens.fraisCaution).toBe("50 €");
    expect(tokens.formatMatch).toBe("3x15 minutes");
  });

  it("derives tournament facts from the Edition entity", () => {
    const tokens = buildPresentationTokens(EDITION, STATIC_INFO);

    expect(tokens.nomTournoi).toBe("Tournoi U11 RCHC");
    expect(tokens.nbEquipesMax).toBe("16");
    expect(tokens.fraisInscription).toBe("350 €");
    expect(tokens.prixRepas).toBe("12 €");
    expect(tokens.anneeAge).toBe("2015 / 2016");
  });

  it("formats a date range spanning two distinct days", () => {
    const tokens = buildPresentationTokens(EDITION, STATIC_INFO);

    expect(tokens.dates).toBe("9 mai - 10 mai");
  });

  it("formats a single date without a range when start and end are the same day", () => {
    const sameDay: Edition = { ...EDITION, dateDebut: "2026-05-09T12:00:00.000Z", dateFinFin: "2026-05-09T12:00:00.000Z" };

    const tokens = buildPresentationTokens(sameDay, STATIC_INFO);

    expect(tokens.dates).toBe("9 mai");
  });

  it("resolves every field to an empty string when edition is null, without throwing", () => {
    const tokens = buildPresentationTokens(null, STATIC_INFO);

    expect(tokens.nomTournoi).toBe("");
    expect(tokens.dates).toBe("");
    expect(tokens.nbEquipesMax).toBe("");
    expect(tokens.fraisInscription).toBe("");
    expect(tokens.prixRepas).toBe("");
    expect(tokens.anneeAge).toBe("");
    // Static info is unaffected by a missing edition.
    expect(tokens.ville).toBe("Cergy");
  });

  it("resolves anneeAge to an empty string when the edition has no configured age years", () => {
    const tokens = buildPresentationTokens({ ...EDITION, anneesAge: [] }, STATIC_INFO);

    expect(tokens.anneeAge).toBe("");
  });
});

describe("resolveTokens", () => {
  const tokens = { ville: "Cergy", vide: "" };

  it("replaces a known placeholder with its value", () => {
    expect(resolveTokens("Le tournoi arrive à {{ville}}.", tokens)).toBe(
      "Le tournoi arrive à Cergy.",
    );
  });

  it("replaces every occurrence of the same placeholder", () => {
    expect(resolveTokens("{{ville}} et encore {{ville}}", tokens)).toBe("Cergy et encore Cergy");
  });

  it("tolerates extra whitespace inside the braces", () => {
    expect(resolveTokens("{{  ville  }}", tokens)).toBe("Cergy");
  });

  it("leaves an unknown placeholder untouched instead of throwing", () => {
    expect(resolveTokens("{{inconnu}}", tokens)).toBe("{{inconnu}}");
  });

  it("leaves a placeholder untouched when its resolved value is an empty string", () => {
    expect(resolveTokens("{{vide}}", tokens)).toBe("{{vide}}");
  });

  it("returns plain text unchanged when it contains no placeholders", () => {
    expect(resolveTokens("Texte simple.", tokens)).toBe("Texte simple.");
  });
});
