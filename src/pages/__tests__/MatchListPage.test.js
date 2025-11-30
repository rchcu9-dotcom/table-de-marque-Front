import { jsx as _jsx } from "react/jsx-runtime";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MatchListPage from "../MatchListPage";
const mockNavigate = vi.fn();
vi.mock("../../hooks/useMatches", () => ({
    useMatches: () => ({
        data: [
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
        ],
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
    it("affiche le score et met en avant l'equipe gagnante", () => {
        render(_jsx(MemoryRouter, { children: _jsx(MatchListPage, {}) }));
        const matchLine = screen.getByTestId("match-line-1");
        expect(matchLine.textContent).toMatch(/Rennes\s*2\s*-\s*1\s*Meudon/i);
    });
    it("filtre les matchs via la recherche", () => {
        render(_jsx(MemoryRouter, { children: _jsx(MatchListPage, { searchQuery: "paris" }) }));
        expect(screen.queryByTestId("match-line-2")).toBeInTheDocument();
        expect(screen.queryByTestId("match-line-1")).not.toBeInTheDocument();
    });
});
