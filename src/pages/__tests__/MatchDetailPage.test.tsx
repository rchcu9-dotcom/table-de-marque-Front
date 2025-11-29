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
      scoreA: 2 as number | null,
      scoreB: 1 as number | null,
    },
    isLoading: false,
    isError: false,
  }),
}));

describe("MatchDetailPage", () => {
  it("affiche le score et met en avant l'équipe gagnante", () => {
    render(
      <MemoryRouter initialEntries={["/matches/1"]}>
        <Routes>
          <Route path="/matches/:id" element={<MatchDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const scoreBlock = screen.getByTestId("match-score");
    expect(scoreBlock.textContent).toMatch(/Rennes\s*2\s*-\s*1\s*Meudon/i);
  });
});
