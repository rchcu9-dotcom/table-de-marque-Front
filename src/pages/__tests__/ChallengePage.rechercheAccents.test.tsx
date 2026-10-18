import "@testing-library/jest-dom/vitest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChallengePage from "../ChallengePage";
import type { ChallengeAllResponse, ChallengeAttempt, ChallengeVitesseJ3Response } from "../../api/challenge";

// docs/specs/-recherche-insensible-aux-accents-contexte-la-recherche-actu.md
// Lignes 5 à 7 du tableau : les trois filtres de ChallengePage — ateliers, top 3 de la
// finale atelier gardien, top 3 de la finale combinée. CA1 à CA8.

let mockChallengeAll: ChallengeAllResponse;
let mockVitesseJ3: ChallengeVitesseJ3Response;
let mockSelectedTeam: { id: string; name: string } | null = null;

type Joueur = { id: string; nom: string; equipeId: string; equipe: string };

const JOUEURS: Joueur[] = [
  { id: "leo", nom: "Léo Martin", equipeId: "meudon", equipe: "Les Comètes de Meudon" },
  { id: "francois", nom: "François Garçon", equipeId: "evry-viry", equipe: "Evry-Viry" },
  { id: "tom", nom: "Tom Dubois", equipeId: "orléans", equipe: "Orléans" },
];
const NOMS = JOUEURS.map((j) => j.nom);

function tentatives(
  atelierType: ChallengeAttempt["atelierType"],
  metrics: (rang: number) => ChallengeAttempt["metrics"],
): ChallengeAttempt[] {
  return JOUEURS.map((j, i) => ({
    joueurId: `${atelierType}-${j.id}`,
    joueurName: j.nom,
    equipeId: j.equipeId,
    equipeName: j.equipe,
    equipeLogoUrl: null,
    atelierId: `${atelierType}-1`,
    atelierLabel: `Atelier ${atelierType}`,
    atelierType,
    phase: "evaluation",
    attemptDate: "2026-05-23T09:00:00.000Z",
    metrics: metrics(i + 1),
  }));
}

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
  useChallengeGardienJ3: () => ({ data: undefined, isLoading: false, isError: false }),
}));
vi.mock("../../hooks/useTeams", () => ({
  useTeams: () => ({
    data: JOUEURS.map((j) => ({ id: j.equipeId, name: j.equipe, logoUrl: null })),
    isLoading: false,
    isError: false,
  }),
}));
vi.mock("../../providers/SelectedTeamProvider", () => ({
  useSelectedTeam: () => ({ selectedTeam: mockSelectedTeam }),
}));

beforeEach(() => {
  mockSelectedTeam = null;
  mockChallengeAll = {
    jour1: [
      // Vitesse avec temps combiné : alimente le bloc atelier ET le top 3 de la finale combinée.
      ...tentatives("vitesse", (r) => ({ type: "vitesse", tempsMs: 20000 + r * 1000, tempsTotal: 40000 + r * 1000 })),
      // Gardien : alimente le top 3 de la finale atelier gardien.
      ...tentatives("gardien_arret", (r) => ({
        type: "gardien_arret",
        tempsMs: 20000 + r * 1000,
        nbButs: r,
        tempsTotal: 30000 + r * 1000,
      })),
    ],
    jour3: [],
    autres: [],
  };
  // Un finaliste : sans lui, le bloc « Finales » (et son top 3 combiné) n'est pas affiché.
  mockVitesseJ3 = {
    slots: { F1: [{ id: "f1", name: "Finaliste Témoin", teamId: "meudon", teamName: "Les Comètes de Meudon" }] },
    winnerId: null,
  } as ChallengeVitesseJ3Response;
});

function rendre() {
  render(
    <MemoryRouter>
      <ChallengePage />
    </MemoryRouter>,
  );
  return screen.getByPlaceholderText(/Recherche joueur/i);
}

const saisir = (champ: HTMLElement, value: string) => fireEvent.change(champ, { target: { value } });

/** Joueurs présents dans une zone de la page. */
const dans = (zone: HTMLElement) => NOMS.filter((nom) => within(zone).queryAllByText(nom).length > 0);

/** Bloc « top 3 » repéré par son titre. */
function blocTop3(titre: string): HTMLElement {
  return screen.getByRole("heading", { name: titre }).parentElement!.parentElement!;
}

/** Les trois zones filtrées par la recherche. */
function zones() {
  return {
    ateliers: dans(screen.getAllByTestId("challenge-attempts")[0].closest("section") as HTMLElement),
    combine: dans(blocTop3("Finale Combiné Joueur")),
    gardien: dans(blocTop3("Finale Atelier Gardien")),
  };
}

describe("ChallengePage — recherche insensible aux accents dans les trois blocs", () => {
  it("affiche les trois joueurs dans chaque bloc sans saisie, puis avec des espaces (CA6)", () => {
    const recherche = rendre();
    const tous = { ateliers: NOMS, combine: NOMS, gardien: NOMS };

    expect(zones()).toEqual(tous);

    saisir(recherche, "   ");

    expect(zones()).toEqual(tous);
  });

  it.each([
    ["leo", "Léo Martin", "CA1 — accent dans la donnée"],
    ["cometes", "Léo Martin", "CA1 — par le nom de l'équipe"],
    ["francois", "François Garçon", "CA4 — cédille"],
    ["garcon", "François Garçon", "CA4 — cédille"],
    ["Évry", "François Garçon", "CA2 — accent dans la saisie"],
    ["ORLEANS", "Tom Dubois", "CA3 — casse et accent"],
    ["orléans", "Tom Dubois", "CA3"],
    ["Orleans", "Tom Dubois", "CA3"],
  ])("« %s » ne garde que « %s » dans les trois blocs (%s)", (saisie, joueur) => {
    const recherche = rendre();

    saisir(recherche, saisie);

    expect(zones()).toEqual({ ateliers: [joueur], combine: [joueur], gardien: [joueur] });
  });

  it("affiche les noms avec leurs accents d'origine (CA7)", () => {
    const recherche = rendre();

    saisir(recherche, "francois garcon");

    expect(screen.getAllByText("François Garçon").length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText("Francois Garcon")).not.toBeInTheDocument();
  });

  it("ne trouve rien pour une saisie sans rapport (CA5)", () => {
    const recherche = rendre();

    saisir(recherche, "strasbourg");

    expect(NOMS.filter((nom) => screen.queryAllByText(nom).length > 0)).toEqual([]);
  });
});

describe("ChallengePage — équipe suivie, identité restée stricte (CA8)", () => {
  it("l'équipe suivie « orleans » ne récupère pas le joueur de « orléans »", () => {
    mockSelectedTeam = { id: "orleans", name: "Orleans" };
    rendre();

    expect(NOMS.filter((nom) => screen.queryAllByText(nom).length > 0)).toEqual([]);
  });

  it("l'équipe suivie reste reconnue sans tenir compte de la casse, et la recherche s'y applique", () => {
    mockSelectedTeam = { id: "MEUDON", name: "Les Comètes de Meudon" };
    const recherche = rendre();

    expect(zones()).toEqual({ ateliers: ["Léo Martin"], combine: ["Léo Martin"], gardien: ["Léo Martin"] });

    saisir(recherche, "leo");
    expect(zones().combine).toEqual(["Léo Martin"]);

    saisir(recherche, "francois");
    expect(NOMS.filter((nom) => screen.queryAllByText(nom).length > 0)).toEqual([]);
  });
});
