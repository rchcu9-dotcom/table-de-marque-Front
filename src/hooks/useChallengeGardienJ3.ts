import { useQuery } from "@tanstack/react-query";
import { fetchChallengeGardienJ3, type ChallengeGardienJ3Response } from "../api/challenge";

export function useChallengeGardienJ3() {
  return useQuery<ChallengeGardienJ3Response>({
    queryKey: ["challenge", "gardien", "j3"],
    queryFn: fetchChallengeGardienJ3,
    staleTime: 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}
