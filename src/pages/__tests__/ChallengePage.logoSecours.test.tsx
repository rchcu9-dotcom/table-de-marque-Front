import "@testing-library/jest-dom/vitest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChallengePage from "../ChallengePage";
import type {
  ChallengeAllResponse,
  ChallengeGardienJ3Response,
  ChallengeVitesseJ3Response,
  GardienJ3Player,
  VitesseJ3Player,
} from "../../api/challenge";

// docs/specs/-impact-sur-les-pages-publiques-contexte-les-pages-publiques.md — §2, CA4
// Seul endroit où le front recalcule une URL de logo : les joueurs des finales Challenge.
// Le slug doit partir d'un nom court — jamais de teamId (clé numérique en base réelle),
// jamais du nom d'affichage de l'équipe.

type Equipe = { id: string; name: string; logoUrl: string | null };

let mockTeams: Equipe[] = [];
let mockVitesseJ3: ChallengeVitesseJ3Response;
let mockGardienJ3: ChallengeGardienJ3Response | undefined;
const mockChallengeAll: ChallengeAllResponse = { jour1: [], jour3: [], autres: [] };

beforeAll(() => {
  (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo = vi.fn();
});

vi.mock("../../hooks/useChallengeAll", () => ({
  useChallengeAll: () => ({ data: mockChallengeAll, isLoading: false, isError: false }),
}));
vi.mock("../../hooks/useChallengeVitesseJ3", () => ({
  useChallengeVitesseJ3: () => ({ data: mockVitesseJ3, isLoading: false, isError: false }),
}));
vi.mock("../../hooks/useChallengeJ1Momentum", () => ({
  useChallengeJ1Momentum: () => ({ data: [], isLoading: false, isError: false }),
}));
vi.mock("../../hooks/useChallengeGardienJ3", () => ({
  useChallengeGardienJ3: () => ({ data: mockGardienJ3, isLoading: false, isError: false }),
}));
vi.mock("../../hooks/useTeams", () => ({
  useTeams: () => ({ data: mockTeams, isLoading: false, isError: false }),
}));
vi.mock("../../providers/SelectedTeamProvider", () => ({
  useSelectedTeam: () => ({ selectedTeam: null }),
}));

function joueur(overrides: Partial<VitesseJ3Player>): VitesseJ3Player {
  return { id: "p1", name: "Léo Martin", teamId: "7", teamName: "Courbevoie", ...overrides };
}

beforeEach(() => {
  mockTeams = [];
  mockVitesseJ3 = { slots: {}, winnerId: null } as ChallengeVitesseJ3Response;
  mockGardienJ3 = undefined;
});

function rendre() {
  render(
    <MemoryRouter>
      <ChallengePage />
    </MemoryRouter>,
  );
}

/** Adresses des images dont le texte alternatif est ce nom d'équipe. */
const logos = (alt: string) =>
  screen.queryAllByAltText(alt).map((img) => img.getAttribute("src") ?? "");

describe.each([
  ["finale vitesse (F1)", (p: VitesseJ3Player) => { mockVitesseJ3 = { slots: { F1: [p] }, winnerId: null } as ChallengeVitesseJ3Response; }],
  ["demi-finale vitesse (DF1)", (p: VitesseJ3Player) => { mockVitesseJ3 = { slots: { DF1: [p] }, winnerId: null } as ChallengeVitesseJ3Response; }],
  ["quart de finale vitesse (QF1)", (p: VitesseJ3Player) => { mockVitesseJ3 = { slots: { QF1: [p] }, winnerId: null } as ChallengeVitesseJ3Response; }],
  ["finale gardien (F1)", (p: VitesseJ3Player) => { mockGardienJ3 = { slots: { F1: [p as GardienJ3Player] }, winnerId: null } as ChallengeGardienJ3Response; }],
  ["demi-finale gardien (DF1)", (p: VitesseJ3Player) => { mockGardienJ3 = { slots: { DF1: [p as GardienJ3Player] }, winnerId: null } as ChallengeGardienJ3Response; }],
] as const)("ChallengePage — logo de secours, %s", (_bloc, placer) => {
  it("base réelle : teamId numérique, le logo vient du nom court renvoyé par l'API", () => {
    // Les équipes publiques sont indexées par leur nom : « 7 » n'en trouve aucune.
    mockTeams = [{ id: "Courbevoie", name: "Courbevoie", logoUrl: "https://cdn.local/api/courbevoie.png" }];
    placer(joueur({ teamId: "7", teamName: "Courbevoie" }));

    rendre();

    const adresses = logos("Courbevoie");
    expect(adresses.length).toBeGreaterThan(0);
    for (const src of adresses) {
      expect(src).toMatch(/\/courbevoie\.png$/);
      expect(src).not.toMatch(/\/7\.png$/);
    }
  });

  it("base réelle : accents et espaces du nom court donnent le bon fichier", () => {
    placer(joueur({ teamId: "3", teamName: "Le Havre" }));

    rendre();

    expect(logos("Le Havre")).toEqual(expect.arrayContaining([expect.stringMatching(/\/le-havre\.png$/)]));
    expect(logos("Le Havre").some((src) => /\/3\.png$/.test(src))).toBe(false);
  });

  it("libellé différent de l'identifiant : le logo vient de l'identifiant de l'équipe", () => {
    mockTeams = [{ id: "rennes", name: "Rennes Cormorans Hockey Club", logoUrl: null }];
    placer(joueur({ teamId: "rennes", teamName: null }));

    rendre();

    // Le nom affiché reste le libellé de l'équipe ; seul le fichier de logo change de source.
    const adresses = logos("Rennes Cormorans Hockey Club");
    expect(adresses.length).toBeGreaterThan(0);
    for (const src of adresses) {
      expect(src).toMatch(/\/rennes\.png$/);
      expect(src).not.toContain("cormorans");
    }
  });

  it("équipe trouvée et nom d'API long : l'identifiant de l'équipe l'emporte", () => {
    mockTeams = [{ id: "Rennes", name: "Rennes", logoUrl: null }];
    placer(joueur({ teamId: "Rennes", teamName: "Rennes Cormorans Hockey Club" }));

    rendre();

    for (const src of logos("Rennes Cormorans Hockey Club")) {
      expect(src).toMatch(/\/rennes\.png$/);
    }
    expect(logos("Rennes Cormorans Hockey Club").length).toBeGreaterThan(0);
  });

  it("le logo fourni par l'API reste prioritaire quand l'équipe est trouvée", () => {
    mockTeams = [{ id: "rennes", name: "Rennes", logoUrl: "https://cdn.local/api/rennes-officiel.png" }];
    placer(joueur({ teamId: "RENNES", teamName: "Rennes" }));

    rendre();

    expect(logos("Rennes")).toContain("https://cdn.local/api/rennes-officiel.png");
    expect(logos("Rennes").some((src) => src.endsWith("/rennes.png"))).toBe(false);
  });

  it("n'affiche aucune image quand ni l'équipe ni le nom ne sont connus", () => {
    placer(joueur({ teamId: "99", teamName: null }));

    rendre();

    expect(document.querySelectorAll('img[src$="/99.png"]')).toHaveLength(0);
    expect(logos("Equipe")).toEqual([]);
  });
});
