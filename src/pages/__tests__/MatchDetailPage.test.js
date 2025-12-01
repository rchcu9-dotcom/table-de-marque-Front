import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MatchDetailPage from "../MatchDetailPage";
vi.mock("../../hooks/useMatches", () => ({
    useMatch: () => ({
        data: {
            id: "1",
            date: "2025-11-29T08:00:00.000Z",
            teamA: "Rennes",
            teamB: "Meudon",
            status: "finished",
            scoreA: 2,
            scoreB: 1,
        },
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
    it("affiche le score et met en avant l'équipe gagnante", () => {
        render(_jsx(MemoryRouter, { initialEntries: ["/matches/1"], children: _jsx(Routes, { children: _jsx(Route, { path: "/matches/:id", element: _jsx(MatchDetailPage, {}) }) }) }));
        const scoreBlock = screen.getByTestId("match-score");
        expect(scoreBlock.textContent).toMatch(/Rennes\s*2\s*-\s*1\s*Meudon/i);
    });
    it("affiche le classement de la poule", () => {
        render(_jsx(MemoryRouter, { initialEntries: ["/matches/1"], children: _jsx(Routes, { children: _jsx(Route, { path: "/matches/:id", element: _jsx(MatchDetailPage, {}) }) }) }));
        expect(screen.getByText(/Classement/i)).toBeInTheDocument();
        const rows = screen.getAllByText(/Rennes/i);
        expect(rows.length).toBeGreaterThan(0);
        expect(screen.getByText(/Pts/i)).toBeInTheDocument();
    });
});
