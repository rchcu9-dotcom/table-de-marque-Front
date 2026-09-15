import { describe, it, expect, afterEach, vi } from "vitest";
import { getPresentationStaticInfo } from "../presentationStaticInfo";

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
