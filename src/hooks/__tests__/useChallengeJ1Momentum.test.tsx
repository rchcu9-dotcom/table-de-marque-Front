import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useChallengeJ1Momentum } from "../useChallengeJ1Momentum";
import { useQuery } from "@tanstack/react-query";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
}));

describe("useChallengeJ1Momentum", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
  });

  it("uses the dedicated query key challenge momentum j1", () => {
    renderHook(() => useChallengeJ1Momentum());

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["challenge", "momentum", "j1"],
      }),
    );
  });
});
