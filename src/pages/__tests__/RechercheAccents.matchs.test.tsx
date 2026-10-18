import "@testing-library/jest-dom/vitest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MatchListPage from "../MatchListPage";
import PlanningPage from "../PlanningPage";
import ThreeVThreePage from "../ThreeVThreePage";
import type { Match } from "../../api/match";

// docs/specs/-recherche-insensible-aux-accents-contexte-la-recherche-actu.md
// Lignes 2 à 4 du tableau : liste des matchs, planning, 3v3 — CA1 à CA3, CA5 à CA8.

let matches: Match[] = [];
let selectedTeam: { id: string; name: string } | null = null;

function match(id: string, teamA: string, teamB: string, extra: Partial<Match> = {}): Match {
  return {
    id,
    date: `2026-05-23T${String(8 + Number(id.replace(/\D/g, "") || 0)).padStart(2, "0")}:00:00.000Z`,
    teamA,
    teamB,
    status: "planned",
    scoreA: null,
    scoreB: null,
    competitionType: "5v5",
    surface: "GG",
    pouleName: "Poule A",
    ...extra,
  };
}

beforeAll(() => {
  (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo = vi.fn();
  (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView = vi.fn();
});

vi.mock("../../hooks/useMatches", () => ({
  useMatches: () => ({ data: matches, isLoading: false, isError: false }),
  useMatchesFiltered: () => ({ data: matches, isLoading: false, isError: false }),
}));

vi.mock("../../providers/SelectedTeamProvider", () => ({
  useSelectedTeam: () => ({ selectedTeam }),
}));

vi.mock("../../hooks/usePartenaires", () => ({
  usePartenaires: () => ({ data: [], isLoading: false }),
}));

vi.mock("../../hooks/useClassement", () => ({
  useJ3FinalSquares: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("react-router-dom", async (orig) => {
  const mod = await orig();
  return { ...(mod as object), useNavigate: () => vi.fn() };
});

beforeEach(() => {
  selectedTeam = null;
  matches = [
    match("m1", "Orléans", "Rennes"),
    match("m2", "Evry-Viry", "Les Comètes de Meudon"),
    match("m3", "Compiegne", "Tours"),
  ];
});

/** Une équipe est-elle affichée dans la liste (peu importe combien de fois) ? */
const visible = (nom: string) => screen.queryAllByText(nom).length > 0;

describe.each([
  ["PlanningPage", PlanningPage, /Equipe, poule, competition/],
  ["ThreeVThreePage", ThreeVThreePage, /Equipe, poule/],
] as const)("%s — recherche insensible aux accents", (_nom, Page, placeholder) => {
  function rendre() {
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    return screen.getByPlaceholderText(placeholder);
  }

  it("affiche tous les matchs sans saisie, puis avec une saisie faite d'espaces (CA6)", () => {
    const recherche = rendre();

    expect(visible("Orléans")).toBe(true);
    expect(visible("Evry-Viry")).toBe(true);
    expect(visible("Compiegne")).toBe(true);

    fireEvent.change(recherche, { target: { value: "   " } });

    expect(visible("Orléans")).toBe(true);
    expect(visible("Compiegne")).toBe(true);
  });

  it("« orleans » trouve le match d'« Orléans », affiché avec son accent (CA1, CA7)", () => {
    const recherche = rendre();

    fireEvent.change(recherche, { target: { value: "orleans" } });

    expect(visible("Orléans")).toBe(true);
    expect(visible("Rennes")).toBe(true);
    expect(visible("Evry-Viry")).toBe(false);
    expect(visible("Compiegne")).toBe(false);
  });

  it("« cometes » trouve le match des « Comètes de Meudon » (CA1)", () => {
    const recherche = rendre();

    fireEvent.change(recherche, { target: { value: "cometes" } });

    expect(visible("Les Comètes de Meudon")).toBe(true);
    expect(visible("Orléans")).toBe(false);
  });

  it.each([
    ["Évry", "Evry-Viry"],
    ["compiègne", "Compiegne"],
  ])("« %s » trouve « %s », donnée sans accent (CA2)", (saisie, equipe) => {
    const recherche = rendre();

    fireEvent.change(recherche, { target: { value: saisie } });

    expect(visible(equipe)).toBe(true);
    expect(visible("Orléans")).toBe(false);
  });

  it("« ORLEANS », « orléans » et « Orleans » donnent le même résultat (CA3)", () => {
    const recherche = rendre();

    for (const saisie of ["ORLEANS", "orléans", "Orleans"]) {
      fireEvent.change(recherche, { target: { value: saisie } });

      expect(visible("Orléans")).toBe(true);
      expect(visible("Evry-Viry")).toBe(false);
      expect(visible("Compiegne")).toBe(false);
    }
  });

  it("cherche aussi dans la poule, accents ignorés", () => {
    matches = [
      match("m1", "Orléans", "Rennes", { pouleName: "Carré Or" }),
      match("m2", "Tours", "Meudon", { pouleName: "Poule B" }),
    ];
    const recherche = rendre();

    fireEvent.change(recherche, { target: { value: "carre" } });

    expect(visible("Orléans")).toBe(true);
    expect(visible("Tours")).toBe(false);
  });

  it("ne trouve rien pour une saisie sans rapport (CA5)", () => {
    const recherche = rendre();

    fireEvent.change(recherche, { target: { value: "strasbourg" } });

    expect(visible("Orléans")).toBe(false);
    expect(visible("Evry-Viry")).toBe(false);
    expect(visible("Compiegne")).toBe(false);
  });

  describe("équipe suivie — identité restée stricte (CA8)", () => {
    beforeEach(() => {
      matches = [
        match("m1", "Orléans", "Rennes"),
        match("m2", "Orleans", "Meudon"),
        match("m3", "Tours", "Nantes"),
      ];
    });

    it("ne retient que les matchs de l'équipe suivie, à l'accent près", () => {
      selectedTeam = { id: "Orleans", name: "Orleans" };
      rendre();

      // « Orleans » (sans accent) est suivie : le match d'« Orléans » ne lui est pas rattaché.
      expect(visible("Meudon")).toBe(true);
      expect(visible("Rennes")).toBe(false);
      expect(visible("Nantes")).toBe(false);
    });

    it("reste insensible à la casse, comme avant", () => {
      selectedTeam = { id: "ORLÉANS", name: "Orléans" };
      rendre();

      expect(visible("Rennes")).toBe(true);
      expect(visible("Meudon")).toBe(false);
    });

    it("la recherche s'applique à l'intérieur des matchs de l'équipe suivie", () => {
      selectedTeam = { id: "Orléans", name: "Orléans" };
      const recherche = rendre();

      fireEvent.change(recherche, { target: { value: "meudon" } });

      // Meudon joue contre « Orleans », pas contre l'équipe suivie « Orléans ».
      expect(visible("Meudon")).toBe(false);
      expect(visible("Rennes")).toBe(false);

      fireEvent.change(recherche, { target: { value: "RENNES" } });

      expect(visible("Rennes")).toBe(true);
    });
  });
});

describe("MatchListPage — recherche insensible aux accents", () => {
  function lignes(saisie: string): string[] {
    const { unmount } = render(
      <MemoryRouter>
        <MatchListPage searchQuery={saisie} />
      </MemoryRouter>,
    );
    // Sans aucun résultat, la page n'affiche pas la liste du tout.
    const liste = screen.queryByTestId("planning-list");
    const ids = liste
      ? within(liste)
          .queryAllByTestId(/^match-line-/)
          .map((el) => el.getAttribute("data-testid")!.replace("match-line-", ""))
      : [];
    unmount();
    return ids;
  }

  it("affiche tous les matchs sans saisie ou avec des espaces (CA6)", () => {
    expect(lignes("")).toEqual(["m1", "m2", "m3"]);
    expect(lignes("   ")).toEqual(["m1", "m2", "m3"]);
  });

  it.each([
    ["orleans", ["m1"]],
    ["cometes", ["m2"]],
    ["Évry", ["m2"]],
    ["compiègne", ["m3"]],
  ])("« %s » trouve %j (CA1, CA2)", (saisie, attendu) => {
    expect(lignes(saisie)).toEqual(attendu);
  });

  it("« ORLEANS », « orléans » et « Orleans » donnent le même résultat (CA3)", () => {
    expect(lignes("ORLEANS")).toEqual(["m1"]);
    expect(lignes("orléans")).toEqual(["m1"]);
    expect(lignes("Orleans")).toEqual(["m1"]);
  });

  it("cherche sur les deux équipes à la fois, accents ignorés", () => {
    expect(lignes("orleans rennes")).toEqual(["m1"]);
    expect(lignes("evry-viry les cometes")).toEqual(["m2"]);
  });

  it("garde la recherche par identifiant et par statut", () => {
    matches = [
      match("m1", "Orléans", "Rennes", { status: "finished", scoreA: 2, scoreB: 1 }),
      match("m2", "Tours", "Meudon"),
    ];

    expect(lignes("m2")).toEqual(["m2"]);
    expect(lignes("FINISHED")).toEqual(["m1"]);
  });

  it("ne trouve rien pour une saisie sans rapport (CA5)", () => {
    expect(lignes("strasbourg")).toEqual([]);
  });

  it("affiche le nom avec son accent d'origine (CA7)", () => {
    render(
      <MemoryRouter>
        <MatchListPage searchQuery="orleans" />
      </MemoryRouter>,
    );

    expect(
      within(screen.getByTestId("planning-list")).getByTestId("match-line-m1").textContent,
    ).toContain("Orléans");
  });
});
