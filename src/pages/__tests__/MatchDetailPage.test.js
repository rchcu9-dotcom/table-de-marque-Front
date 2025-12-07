import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MatchDetailPage from "../MatchDetailPage";
const baseMatch = {
    id: "1",
    date: "2025-11-29T08:00:00.000Z",
    teamA: "Rennes",
    teamB: "Meudon",
    status: "finished",
    scoreA: 2,
    scoreB: 1,
    pouleCode: "A",
    pouleName: "Poule A",
};
let mockMatch = { ...baseMatch };
const baseAllMatches = [
    {
        id: "1",
        date: "2025-11-29T08:00:00.000Z",
        teamA: "Rennes",
        teamB: "Meudon",
        status: "finished",
        scoreA: 2,
        scoreB: 1,
        pouleCode: "A",
        pouleName: "Poule A",
    },
    {
        id: "2",
        date: "2025-11-29T09:00:00.000Z",
        teamA: "Paris",
        teamB: "Lyon",
        status: "planned",
        scoreA: null,
        scoreB: null,
        pouleCode: "A",
        pouleName: "Poule A",
    },
];
let mockAllMatches = baseAllMatches.map((m) => ({ ...m }));
vi.mock("../../hooks/useMatches", () => ({
    useMatch: () => ({
        data: mockMatch,
        isLoading: false,
        isError: false,
    }),
    useMatches: () => ({
        data: mockAllMatches,
        isLoading: false,
        isError: false,
    }),
}));
vi.mock("../../hooks/useClassement", () => ({
    useClassementForMatch: () => ({
        data: {
            pouleCode: "A",
            pouleName: "Poule A",
            equipes: [
                {
                    id: "Rennes",
                    name: "Rennes",
                    logoUrl: "https://example.com/logo.png",
                    rang: 1,
                    points: 10,
                    victoires: 3,
                    nuls: 1,
                    defaites: 0,
                    diff: 5,
                    pouleCode: "A",
                    pouleName: "Poule A",
                },
            ],
        },
        isLoading: false,
        isError: false,
    }),
}));
describe("MatchDetailPage", () => {
    beforeAll(() => {
        Object.defineProperty(HTMLElement.prototype, "scrollTo", {
            value: vi.fn(),
            writable: true,
        });
    });
    beforeEach(() => {
        mockMatch = { ...baseMatch };
        mockAllMatches = baseAllMatches.map((m) => ({ ...m }));
    });
    it("affiche le score et met en avant l'equipe gagnante", () => {
        mockMatch = { ...mockMatch, status: "finished", scoreA: 2, scoreB: 1 };
        render(_jsx(MemoryRouter, { initialEntries: ["/matches/1"], children: _jsx(Routes, { children: _jsx(Route, { path: "/matches/:id", element: _jsx(MatchDetailPage, {}) }) }) }));
        const scoreBlock = screen.getByTestId("match-score");
        expect(scoreBlock.textContent).toMatch(/Rennes\s*2\s*-\s*1\s*Meudon/i);
    });
    it("affiche le classement de la poule", () => {
        mockMatch = { ...mockMatch, status: "finished" };
        render(_jsx(MemoryRouter, { initialEntries: ["/matches/1"], children: _jsx(Routes, { children: _jsx(Route, { path: "/matches/:id", element: _jsx(MatchDetailPage, {}) }) }) }));
        expect(screen.getByText(/Classement/i)).toBeInTheDocument();
        const rows = screen.getAllByText(/Rennes/i);
        expect(rows.length).toBeGreaterThan(0);
        expect(screen.getByText(/Pts/i)).toBeInTheDocument();
    });
    it("poule affichée, pulsation en cours, slider et résumés alignés au statut", () => {
        mockMatch = {
            ...mockMatch,
            status: "ongoing",
            scoreA: 0,
            scoreB: 0,
            pouleName: "Poule A",
            pouleCode: "A",
        };
        mockAllMatches = mockAllMatches.map((m) => m.id === "1" ? { ...m, status: "ongoing", scoreA: 0, scoreB: 0 } : m);
        render(_jsx(MemoryRouter, { initialEntries: ["/matches/1"], children: _jsx(Routes, { children: _jsx(Route, { path: "/matches/:id", element: _jsx(MatchDetailPage, {}) }) }) }));
        // Carte principale : poule et pulsation
        const pouleTexts = screen.getAllByText(/Poule A/i);
        const mainPouleLabel = pouleTexts.find((node) => node.className.includes("text-xs"));
        expect(mainPouleLabel).toBeTruthy();
        const mainCard = mainPouleLabel?.closest(".live-pulse-card");
        expect(mainCard).toBeInTheDocument();
        // Classement sans nom de poule
        expect(screen.getByText(/^Classement$/)).toBeInTheDocument();
        // Slider titre avec nom de poule
        expect(screen.getByText(/Matchs de la poule Poule A/i)).toBeInTheDocument();
        // Résumés compacts : liseret selon statut sélectionné (ongoing -> amber) + pulsation
        const summarySelected = screen
            .getByTestId("summary-grid-teamA")
            .querySelector('[data-testid="summary-card-1"]');
        expect(summarySelected?.className).toMatch(/border-amber-300/);
        expect(summarySelected?.className).toMatch(/live-pulse-card/);
        // Slider poule : liseret selon statut sélectionné (ongoing -> amber) + pulsation
        const sliderSelected = screen.getByTestId("poule-slider-card-1");
        expect(sliderSelected.className).toMatch(/border-amber-300/);
        expect(sliderSelected.className).toMatch(/live-pulse-card/);
    });
});
