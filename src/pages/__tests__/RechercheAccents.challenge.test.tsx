import "@testing-library/jest-dom/vitest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ChallengeAtelierPage from "../ChallengeAtelierPage";
import ChallengeEquipePage from "../ChallengeEquipePage";
import ChallengeFinaleCombiPage from "../ChallengeFinaleCombiPage";
import ChallengeFinaleAtelierGardienPage from "../ChallengeFinaleAtelierGardienPage";
import type { ChallengeAllResponse, ChallengeAttempt, ChallengeEquipeResponse } from "../../api/challenge";
import type { Team } from "../../api/team";

// docs/specs/-recherche-insensible-aux-accents-contexte-la-recherche-actu.md
// Lignes 8 et 9 du tableau : challenge par équipe, atelier, finale gardien, finale combiné
// — CA1 à CA8.

let teams: Team[] = [];
let challengeAll: ChallengeAllResponse;
let challengeByEquipe: ChallengeEquipeResponse;
let selectedTeam: Team | null = null;

function attempt(overrides: Partial<ChallengeAttempt>): ChallengeAttempt {
  return {
    joueurId: overrides.joueurId ?? "j1",
    joueurName: overrides.joueurName ?? "Alice",
    equipeId: overrides.equipeId ?? "rennes",
    equipeName: overrides.equipeName ?? "Rennes",
    equipeLogoUrl: overrides.equipeLogoUrl ?? null,
    atelierId: overrides.atelierId ?? "vitesse-1",
    atelierLabel: overrides.atelierLabel ?? "Atelier Vitesse",
    atelierType: overrides.atelierType ?? "vitesse",
    phase: overrides.phase ?? "evaluation",
    attemptDate: overrides.attemptDate ?? "2026-05-23T09:00:00.000Z",
    metrics: overrides.metrics ?? { type: "vitesse", tempsMs: 23000, tempsTotal: 46000 },
  };
}

/** Trois joueurs : accent dans le prénom, cédilles, équipe au nom accentué ou non. */
function joueurs(metrics: (rang: number) => ChallengeAttempt["metrics"], atelierType: ChallengeAttempt["atelierType"]) {
  return [
    attempt({
      joueurId: "leo",
      joueurName: "Léo Martin",
      equipeId: "meudon",
      equipeName: "Les Comètes de Meudon",
      atelierType,
      metrics: metrics(1),
    }),
    attempt({
      joueurId: "francois",
      joueurName: "François Garçon",
      equipeId: "evry-viry",
      equipeName: "Evry-Viry",
      atelierType,
      metrics: metrics(2),
    }),
    attempt({
      joueurId: "tom",
      joueurName: "Tom Dubois",
      equipeId: "orléans",
      equipeName: "Orléans",
      atelierType,
      metrics: metrics(3),
    }),
  ];
}

const vitesse = (rang: number): ChallengeAttempt["metrics"] => ({
  type: "vitesse",
  tempsMs: 20000 + rang * 1000,
  tempsTotal: 40000 + rang * 1000,
});
const gardien = (rang: number): ChallengeAttempt["metrics"] => ({
  type: "gardien_arret",
  tempsMs: 20000 + rang * 1000,
  nbButs: rang,
  tempsTotal: 30000 + rang * 1000,
});

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock("../../hooks/useTeams", () => ({
  useTeams: () => ({ data: teams, isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("../../hooks/useChallengeAll", () => ({
  useChallengeAll: () => ({ data: challengeAll, isLoading: false, isError: false }),
}));
vi.mock("../../hooks/useChallengeByEquipe", () => ({
  useChallengeByEquipe: () => ({ data: challengeByEquipe, isLoading: false, isError: false }),
}));
vi.mock("../../hooks/useChallengeJ1Momentum", () => ({
  useChallengeJ1Momentum: () => ({ data: [], isLoading: false, isError: false }),
}));
vi.mock("../../hooks/useChallengeGardienJ3", () => ({
  useChallengeGardienJ3: () => ({ data: undefined, isLoading: false, isError: false }),
}));
vi.mock("../../providers/SelectedTeamProvider", () => ({
  useSelectedTeam: () => ({ selectedTeam }),
}));

beforeEach(() => {
  selectedTeam = null;
  teams = [
    { id: "meudon", name: "Les Comètes de Meudon", logoUrl: null },
    { id: "evry-viry", name: "Evry-Viry", logoUrl: null },
    { id: "orléans", name: "Orléans", logoUrl: null },
  ];
  challengeAll = {
    jour1: [...joueurs(vitesse, "vitesse"), ...joueurs(gardien, "gardien_arret")],
    jour3: [],
    autres: [],
  };
  challengeByEquipe = {
    equipeId: "meudon",
    equipeName: "Les Comètes de Meudon",
    jour1: joueurs(vitesse, "vitesse"),
    jour3: [],
    autres: [],
  };
});

const visible = (nom: string) => screen.queryAllByText(nom).length > 0;
const presents = () =>
  ["Léo Martin", "François Garçon", "Tom Dubois"].filter((nom) => visible(nom));

const PAGES = [
  [
    "ChallengeAtelierPage",
    () => (
      <MemoryRouter initialEntries={["/challenge/atelier/vitesse"]}>
        <Routes>
          <Route path="/challenge/atelier/:type" element={<ChallengeAtelierPage />} />
        </Routes>
      </MemoryRouter>
    ),
    /Filtrer/i,
  ],
  [
    "ChallengeFinaleCombiPage",
    () => (
      <MemoryRouter>
        <ChallengeFinaleCombiPage />
      </MemoryRouter>
    ),
    /Filtrer/i,
  ],
  [
    "ChallengeFinaleAtelierGardienPage",
    () => (
      <MemoryRouter>
        <ChallengeFinaleAtelierGardienPage />
      </MemoryRouter>
    ),
    /Filtrer/i,
  ],
  [
    "ChallengeEquipePage",
    () => (
      <MemoryRouter initialEntries={["/challenge/equipe/meudon"]}>
        <Routes>
          <Route path="/challenge/equipe/:teamId" element={<ChallengeEquipePage />} />
        </Routes>
      </MemoryRouter>
    ),
    /Recherche joueur/i,
  ],
] as const;

describe.each(PAGES)("%s — recherche insensible aux accents", (_nom, page, placeholder) => {
  function rendre() {
    render(page());
    return screen.getByPlaceholderText(placeholder);
  }
  const saisir = (champ: HTMLElement, value: string) => fireEvent.change(champ, { target: { value } });

  it("affiche tous les joueurs sans saisie, puis avec des espaces (CA6)", () => {
    const recherche = rendre();

    expect(presents()).toEqual(["Léo Martin", "François Garçon", "Tom Dubois"]);

    saisir(recherche, "   ");

    expect(presents()).toEqual(["Léo Martin", "François Garçon", "Tom Dubois"]);
  });

  it("« leo » trouve « Léo », affiché avec son accent (CA1, CA7)", () => {
    const recherche = rendre();

    saisir(recherche, "leo");

    expect(presents()).toEqual(["Léo Martin"]);
  });

  it.each([
    ["francois", "François Garçon"],
    ["garcon", "François Garçon"],
  ])("cédille : « %s » trouve « %s » (CA4)", (saisie, joueur) => {
    const recherche = rendre();

    saisir(recherche, saisie);

    expect(presents()).toEqual([joueur]);
  });

  it("« cometes » trouve le joueur des « Comètes de Meudon » par le nom de son équipe (CA1)", () => {
    const recherche = rendre();

    saisir(recherche, "cometes");

    expect(presents()).toEqual(["Léo Martin"]);
  });

  it("« Évry » trouve le joueur d'« Evry-Viry », donnée sans accent (CA2)", () => {
    const recherche = rendre();

    saisir(recherche, "Évry");

    expect(presents()).toEqual(["François Garçon"]);
  });

  it("« ORLEANS », « orléans » et « Orleans » donnent le même résultat (CA3)", () => {
    const recherche = rendre();

    for (const saisie of ["ORLEANS", "orléans", "Orleans"]) {
      saisir(recherche, saisie);

      expect(presents()).toEqual(["Tom Dubois"]);
    }
  });

  it("ne trouve rien pour une saisie sans rapport (CA5)", () => {
    const recherche = rendre();

    saisir(recherche, "strasbourg");

    expect(presents()).toEqual([]);
  });
});

describe("Équipe suivie sur les pages Challenge — identité restée stricte (CA8)", () => {
  it.each(PAGES.slice(0, 3))(
    "%s : l'équipe suivie « orleans » ne récupère pas le joueur de « orléans »",
    (_nom, page) => {
      selectedTeam = { id: "orleans", name: "Orleans", logoUrl: null };

      render(page());

      expect(presents()).toEqual([]);
    },
  );

  it.each(PAGES.slice(0, 3))(
    "%s : l'équipe suivie reste reconnue sans tenir compte de la casse, et la recherche s'y applique",
    (_nom, page, placeholder) => {
      selectedTeam = { id: "MEUDON", name: "Les Comètes de Meudon", logoUrl: null };

      render(page());

      expect(presents()).toEqual(["Léo Martin"]);

      fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value: "francois" } });

      expect(presents()).toEqual([]);
    },
  );
});
