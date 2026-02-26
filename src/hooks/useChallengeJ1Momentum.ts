import { useQuery } from "@tanstack/react-query";
import { fetchChallengeJ1Momentum, type ChallengeJ1MomentumEntry } from "../api/challenge";

export function useChallengeJ1Momentum() {
  return useQuery<ChallengeJ1MomentumEntry[]>({
    queryKey: ["challenge", "momentum", "j1"],
    queryFn: fetchChallengeJ1Momentum,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}

