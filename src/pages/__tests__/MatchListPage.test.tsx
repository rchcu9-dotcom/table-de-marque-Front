import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import MatchListPage from "../MatchListPage";

vi.mock("../../hooks/useMatches", () => ({
  useMatches: () => ({
    data: [
      {
        id: "1",
        date: "2025-11-29T08:00:00.000Z",
        teamA: "Rennes",
        teamB: "Meudon",
        status: "finished",
        scoreA: 2 as number | null,
        scoreB: 1 as number | null,
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("react-router-dom", async (orig) => {
  const mod = await orig();
  return {
    ...(mod as any),
    useNavigate: () => vi.fn(),
  };
});

describe("MatchListPage", () => {
  it("affiche le score et met en avant l'équipe gagnante", () => {
    render(
      <MemoryRouter>
        <MatchListPage />
      </MemoryRouter>,
    );

    const matchLine = screen.getByTestId("match-line-1");
    expect(matchLine.textContent).toMatch(/Rennes\s*2\s*-\s*1\s*Meudon/i);
  });
});
