import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchPresentation, type PresentationGroupe } from "../presentation";

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    clone: () => jsonResponse(body),
  } as unknown as Response;
}

function makeGroupe(overrides: Partial<PresentationGroupe> = {}): PresentationGroupe {
  return {
    nom: "Présentation",
    nomEn: "Presentation",
    ordre: 0,
    dureeMs: 5000,
    imageUrl: null,
    articles: [],
    ...overrides,
  };
}

describe("fetchPresentation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prefixes a relative image proxy path (article and group) with the API base URL", async () => {
    const groupes = [
      makeGroupe({
        imageUrl: "/presentation/image/GROUPE_ID?w=1600",
        articles: [
          {
            groupe: "Présentation",
            groupeEn: "Presentation",
            surtitre: "",
            surtitreEn: "",
            titre: "Résumé",
            titreEn: "Summary",
            description: "",
            descriptionEn: "",
            faits: "",
            faitsEn: "",
            titreAccroche: "",
            titreAccrocheEn: "",
            descriptionCourte: "",
            descriptionCourteEn: "",
            imageUrl: "/presentation/image/ARTICLE_ID?w=1600",
            lienUrl: null,
            lieu: null,
            mapsQuery: null,
          },
        ],
      }),
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(groupes));

    const result = await fetchPresentation();

    expect(result[0].imageUrl).toBe(
      "http://localhost:3000/presentation/image/GROUPE_ID?w=1600",
    );
    expect(result[0].articles[0].imageUrl).toBe(
      "http://localhost:3000/presentation/image/ARTICLE_ID?w=1600",
    );
  });

  it("leaves a null imageUrl as null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([makeGroupe({ imageUrl: null })]));

    const result = await fetchPresentation();

    expect(result[0].imageUrl).toBeNull();
  });

  it("leaves an already-absolute (non-Drive) image URL untouched", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse([makeGroupe({ imageUrl: "https://cdn.example.com/glace.jpg" })]),
    );

    const result = await fetchPresentation();

    expect(result[0].imageUrl).toBe("https://cdn.example.com/glace.jpg");
  });
});
