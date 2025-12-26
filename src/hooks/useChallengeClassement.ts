import { useQuery } from "@tanstack/react-query";
import { fetchClassementGlobalChallenge, type ClassementGlobalEntry } from "../api/challenge";

export function useChallengeClassement() {
  return useQuery<ClassementGlobalEntry[]>({
    queryKey: ["challenge", "classement-global"],
    queryFn: fetchClassementGlobalChallenge,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
