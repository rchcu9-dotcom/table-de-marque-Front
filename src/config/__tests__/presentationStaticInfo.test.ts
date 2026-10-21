import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getPresentationLieuUrl,
  getPresentationStaticInfo,
  sanitizeLieuUrl,
} from "../presentationStaticInfo";

describe("sanitizeLieuUrl", () => {
  it("accepte une URL http(s) absolue, sans tenir compte de la casse, et la débarrasse de ses espaces", () => {
    expect(sanitizeLieuUrl("https://www.leblizz.com")).toBe("https://www.leblizz.com");
    expect(sanitizeLieuUrl("  HTTP://leblizz.com/  ")).toBe("HTTP://leblizz.com/");
  });

  it.each([undefined, "", "www.leblizz.com", "javascript:alert(1)", "https://", "https://a b"])(
    "rejette %j",
    (raw) => {
      expect(sanitizeLieuUrl(raw)).toBe("");
    },
  );
});

describe("getPresentationLieuUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lit VITE_TOURNOI_LIEU_URL et la filtre", () => {
    vi.stubEnv("VITE_TOURNOI_LIEU_URL", "https://www.leblizz.com");
    expect(getPresentationLieuUrl()).toBe("https://www.leblizz.com");

    vi.stubEnv("VITE_TOURNOI_LIEU_URL", "javascript:alert(1)");
    expect(getPresentationLieuUrl()).toBe("");
  });
});

describe("getPresentationStaticInfo", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads every field from its VITE_TOURNOI_* environment variable", () => {
    vi.stubEnv("VITE_TOURNOI_VILLE", "Cergy");
    vi.stubEnv("VITE_TOURNOI_LIEU", "Patinoire de Cergy");
    vi.stubEnv("VITE_TOURNOI_CLUB_NOM", "RCHC");
    vi.stubEnv("VITE_TOURNOI_FRAIS_CAUTION", "50 €");
    vi.stubEnv("VITE_TOURNOI_FORMAT_MATCH", "3x15 minutes");

    expect(getPresentationStaticInfo()).toEqual({
      ville: "Cergy",
      lieu: "Patinoire de Cergy",
      clubNom: "RCHC",
      fraisCaution: "50 €",
      formatMatch: "3x15 minutes",
    });
  });

  it("falls back to an empty string for any variable left unset, rather than throwing", () => {
    vi.stubEnv("VITE_TOURNOI_VILLE", "");
    vi.stubEnv("VITE_TOURNOI_LIEU", "");
    vi.stubEnv("VITE_TOURNOI_CLUB_NOM", "");
    vi.stubEnv("VITE_TOURNOI_FRAIS_CAUTION", "");
    vi.stubEnv("VITE_TOURNOI_FORMAT_MATCH", "");

    expect(getPresentationStaticInfo()).toEqual({
      ville: "",
      lieu: "",
      clubNom: "",
      fraisCaution: "",
      formatMatch: "",
    });
  });
});
