import { describe, it, expect } from "vitest";
import {
  pickLocalized,
  isMediaGroup,
  isInscriptionArticle,
  isResumeArticle,
  isYoutubeArticle,
} from "../presentationContent";

describe("pickLocalized", () => {
  it("returns the French text when lang is fr", () => {
    expect(pickLocalized("fr", "Bonjour", "Hello")).toBe("Bonjour");
  });

  it("returns the English text when lang is en and it is filled", () => {
    expect(pickLocalized("en", "Bonjour", "Hello")).toBe("Hello");
  });

  it("falls back to French when lang is en but the English text is empty", () => {
    expect(pickLocalized("en", "Bonjour", "")).toBe("Bonjour");
  });

  it("falls back to French when lang is en but the English text is only whitespace", () => {
    expect(pickLocalized("en", "Bonjour", "   ")).toBe("Bonjour");
  });
});

describe("isMediaGroup", () => {
  it("matches the French group name regardless of case", () => {
    expect(isMediaGroup("Médias")).toBe(true);
    expect(isMediaGroup("MEDIAS")).toBe(true);
    expect(isMediaGroup("médias")).toBe(true);
  });

  it("matches without the accent (defensive against source data drift)", () => {
    expect(isMediaGroup("Medias")).toBe(true);
  });

  it("matches the singular EN/FR variant", () => {
    expect(isMediaGroup("Media")).toBe(true);
  });

  it("returns false for unrelated group names", () => {
    expect(isMediaGroup("Présentation")).toBe(false);
    expect(isMediaGroup("Tournoi 5v5 pleine Glace")).toBe(false);
  });
});

describe("isInscriptionArticle", () => {
  it("matches the exact title 'Inscription' case-insensitively", () => {
    expect(isInscriptionArticle("Inscription")).toBe(true);
    expect(isInscriptionArticle("inscription")).toBe(true);
    expect(isInscriptionArticle("INSCRIPTION")).toBe(true);
  });

  it("does not match on partial/substring titles", () => {
    expect(isInscriptionArticle("Informations")).toBe(false);
    expect(isInscriptionArticle("Formulaire d'inscription")).toBe(false);
  });
});

describe("isResumeArticle", () => {
  it("matches 'Résumé' regardless of accent/case", () => {
    expect(isResumeArticle("Résumé")).toBe(true);
    expect(isResumeArticle("resume")).toBe(true);
    expect(isResumeArticle("RESUME")).toBe(true);
  });

  it("returns false for other titles", () => {
    expect(isResumeArticle("Planning")).toBe(false);
  });
});

describe("isYoutubeArticle", () => {
  it("matches titles containing 'youtube' regardless of case", () => {
    expect(isYoutubeArticle("Chaîne YouTube")).toBe(true);
    expect(isYoutubeArticle("youtube channel")).toBe(true);
  });

  it("returns false for titles that do not mention YouTube", () => {
    expect(isYoutubeArticle("Instagram")).toBe(false);
    expect(isYoutubeArticle("Facebook")).toBe(false);
  });
});
