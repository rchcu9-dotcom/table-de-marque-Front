import { describe, it, expect } from "vitest";
import {
  IMAGE_URL_SCHEME_MESSAGE,
  IMAGE_URL_TOO_LONG_MESSAGE,
  PRESENTATION_IMAGE_URL_MAX_LENGTH,
  getPresentationImageUrlError,
  isValidPresentationImageUrl,
  toPreviewImageUrl,
} from "../presentationImageUrl";

// Base d'API injectée par tests/unit/setup.ts (__APP_API_BASE_URL__).
const API = "http://localhost:3000";

const urlOfLength = (length: number) => {
  const prefix = "https://cdn.example.com/";
  return prefix + "a".repeat(length - prefix.length);
};

describe("getPresentationImageUrlError (miroir du DTO back)", () => {
  it("mirrors the back max length (VARCHAR(500))", () => {
    expect(PRESENTATION_IMAGE_URL_MAX_LENGTH).toBe(500);
  });

  it.each([
    ["vide (retrait de l'image)", ""],
    ["espaces seuls", "   "],
    ["https", "https://cdn.example.com/glace.jpg"],
    ["http", "http://www.leblizz.com"],
    ["Http mixte", "Http://www.leblizz.com"],
    ["lien Drive", "https://drive.google.com/file/d/ABC/view"],
    ["entouré d'espaces", "  https://cdn.example.com/a.jpg  "],
    ["exactement 500 caractères", urlOfLength(500)],
  ])("accepts %s", (_label, url) => {
    expect(getPresentationImageUrlError(url)).toBeNull();
    expect(isValidPresentationImageUrl(url)).toBe(true);
  });

  it("rejects more than 500 characters with the back's length message", () => {
    expect(getPresentationImageUrlError(urlOfLength(501))).toBe(IMAGE_URL_TOO_LONG_MESSAGE);
    expect(IMAGE_URL_TOO_LONG_MESSAGE).toBe("L'URL de l'image ne doit pas dépasser 500 caractères.");
  });

  it.each([
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:image/png;base64,AAAA"],
    ["ftp:", "ftp://example.com/a.jpg"],
    ["chemin relatif", "/presentation/image/abc"],
    ["sans schéma", "www.leblizz.com"],
    ["espace interne", "https://cdn.example.com/ma photo.jpg"],
  ])("rejects %s with the back's scheme message", (_label, url) => {
    expect(getPresentationImageUrlError(url)).toBe(IMAGE_URL_SCHEME_MESSAGE);
    expect(isValidPresentationImageUrl(url)).toBe(false);
  });

  it("uses the exact French scheme message of the back DTO", () => {
    expect(IMAGE_URL_SCHEME_MESSAGE).toBe("L'URL de l'image doit commencer par http:// ou https://.");
  });
});

describe("toPreviewImageUrl", () => {
  it("routes a Drive share link through the public back relay", () => {
    expect(
      toPreviewImageUrl("https://drive.google.com/file/d/1fBgBRaLnMiagMthr6ibghOFLeyf03ZUa/view?usp=sharing"),
    ).toBe(`${API}/presentation/image/1fBgBRaLnMiagMthr6ibghOFLeyf03ZUa?w=400`);
  });

  it("routes a Drive thumbnail link through the public back relay", () => {
    expect(toPreviewImageUrl("https://drive.google.com/thumbnail?id=XYZ_9&sz=w600")).toBe(
      `${API}/presentation/image/XYZ_9?w=400`,
    );
  });

  it("keeps any other valid http(s) URL as is (trimmed)", () => {
    expect(toPreviewImageUrl("  https://cdn.example.com/glace.jpg ")).toBe("https://cdn.example.com/glace.jpg");
  });

  it.each([
    ["vide", ""],
    ["javascript:", "javascript:alert(1)"],
    ["sans schéma", "www.leblizz.com"],
    ["trop longue", urlOfLength(501)],
  ])("returns null for an URL that would be refused (%s)", (_label, url) => {
    expect(toPreviewImageUrl(url)).toBeNull();
  });
});
