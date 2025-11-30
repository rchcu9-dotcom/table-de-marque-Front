import { jsx as _jsx } from "react/jsx-runtime";
import "@testing-library/jest-dom/vitest";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MatchListPage from "../MatchListPage";
const mockNavigate = vi.fn();
let mockData = [];
vi.mock("../../hooks/useMatches", () => ({
    useMatches: () => ({
        data: mockData,
        isLoading: false,
        isError: false,
    }),
}));
vi.mock("react-router-dom", async (orig) => {
    const mod = await orig();
    return {
        ...mod,
        useNavigate: () => mockNavigate,
    };
});
describe("MatchListPage", () => {
    beforeEach(() => {
        mockData = [
            {
                id: "1",
                date: "2025-11-29T08:00:00.000Z",
                teamA: "Rennes",
                teamB: "Meudon",
                status: "finished",
                scoreA: 2,
                scoreB: 1,
            },
            {
                id: "2",
                date: "2025-11-29T09:00:00.000Z",
                teamA: "Paris",
                teamB: "Lyon",
                status: "ongoing",
                scoreA: 5,
                scoreB: 3,
            },
            {
                id: "3",
                date: "2025-11-29T10:00:00.000Z",
                teamA: "Nantes",
                teamB: "Bordeaux",
                status: "planned",
                scoreA: null,
                scoreB: null,
            },
        ];
    });
    it("affiche le score et met en avant l'equipe gagnante", () => {
        render(_jsx(MemoryRouter, { children: _jsx(MatchListPage, {}) }));
        const planning = within(screen.getByTestId("planning-list"));
        const matchLine = planning.getByTestId("match-line-1");
        expect(matchLine.textContent).toMatch(/Rennes\s*2\s*-\s*1\s*Meudon/i);
    });
    it("filtre les matchs via la recherche", () => {
        render(_jsx(MemoryRouter, { children: _jsx(MatchListPage, { searchQuery: "paris" }) }));
        const planning = within(screen.getByTestId("planning-list"));
        expect(planning.queryByTestId("match-line-2")).toBeInTheDocument();
        expect(planning.queryByTestId("match-line-1")).not.toBeInTheDocument();
    });
    it("ne filtre ni ne trie la liste momentum avec la recherche", () => {
        mockData = [
            { id: "a", date: "2025-01-01T08:00:00Z", teamA: "Alpha", teamB: "Beta", status: "planned", scoreA: null, scoreB: null },
            { id: "b", date: "2025-01-01T09:00:00Z", teamA: "Gamma", teamB: "Delta", status: "planned", scoreA: null, scoreB: null },
            { id: "c", date: "2025-01-01T10:00:00Z", teamA: "Paris", teamB: "Omega", status: "planned", scoreA: null, scoreB: null },
        ];
        render(_jsx(MemoryRouter, { children: _jsx(MatchListPage, { searchQuery: "paris" }) }));
        const momentum = within(screen.getByTestId("momentum-list"));
        const ids = momentum
            .queryAllByTestId(/momentum-match-/)
            .map((el) => el.getAttribute("data-testid"));
        expect(ids).toEqual(["momentum-match-a", "momentum-match-b", "momentum-match-c"]);
        const planning = within(screen.getByTestId("planning-list"));
        expect(planning.getAllByTestId(/match-line-/).length).toBe(1); // seul le match filtré reste
    });
    it("momentum sans match en cours prend les 3 premiers par date", () => {
        mockData = [
            { id: "a", date: "2025-01-01T08:00:00Z", teamA: "A", teamB: "B", status: "planned", scoreA: null, scoreB: null },
            { id: "b", date: "2025-01-01T09:00:00Z", teamA: "C", teamB: "D", status: "planned", scoreA: null, scoreB: null },
            { id: "c", date: "2025-01-01T10:00:00Z", teamA: "E", teamB: "F", status: "planned", scoreA: null, scoreB: null },
            { id: "d", date: "2025-01-01T11:00:00Z", teamA: "G", teamB: "H", status: "planned", scoreA: null, scoreB: null },
        ];
        render(_jsx(MemoryRouter, { children: _jsx(MatchListPage, {}) }));
        const momentum = within(screen.getByTestId("momentum-list"));
        const ids = momentum
            .getAllByTestId(/momentum-match-/)
            .map((el) => el.getAttribute("data-testid"));
        expect(ids).toEqual(["momentum-match-a", "momentum-match-b", "momentum-match-c"]);
    });
    it("momentum autour d'un match en cours affiche precedent, courant, suivant", () => {
        mockData = [
            { id: "a", date: "2025-01-01T08:00:00Z", teamA: "A", teamB: "B", status: "planned", scoreA: null, scoreB: null },
            { id: "b", date: "2025-01-01T09:00:00Z", teamA: "C", teamB: "D", status: "ongoing", scoreA: 1, scoreB: 1 },
            { id: "c", date: "2025-01-01T10:00:00Z", teamA: "E", teamB: "F", status: "planned", scoreA: null, scoreB: null },
            { id: "d", date: "2025-01-01T11:00:00Z", teamA: "G", teamB: "H", status: "planned", scoreA: null, scoreB: null },
        ];
        render(_jsx(MemoryRouter, { children: _jsx(MatchListPage, {}) }));
        const momentum = within(screen.getByTestId("momentum-list"));
        const ids = momentum
            .getAllByTestId(/momentum-match-/)
            .map((el) => el.getAttribute("data-testid"));
        expect(ids).toEqual(["momentum-match-a", "momentum-match-b", "momentum-match-c"]);
    });
    it("momentum avec tous les matchs joues prend les 3 derniers par date decroissante", () => {
        mockData = [
            { id: "a", date: "2025-01-01T08:00:00Z", teamA: "A", teamB: "B", status: "finished", scoreA: 1, scoreB: 0 },
            { id: "b", date: "2025-01-01T09:00:00Z", teamA: "C", teamB: "D", status: "finished", scoreA: 2, scoreB: 2 },
            { id: "c", date: "2025-01-01T10:00:00Z", teamA: "E", teamB: "F", status: "finished", scoreA: 3, scoreB: 1 },
            { id: "d", date: "2025-01-01T11:00:00Z", teamA: "G", teamB: "H", status: "finished", scoreA: 4, scoreB: 4 },
        ];
        render(_jsx(MemoryRouter, { children: _jsx(MatchListPage, {}) }));
        const momentum = within(screen.getByTestId("momentum-list"));
        const ids = momentum
            .getAllByTestId(/momentum-match-/)
            .slice(0, 3)
            .map((el) => el.getAttribute("data-testid"));
        expect(ids).toEqual(["momentum-match-d", "momentum-match-c", "momentum-match-b"]);
    });
});
