import { useQuery } from "@tanstack/react-query";
import { ChallengeEquipeResponse, fetchChallengeByEquipe } from "../api/challenge";

export function useChallengeByEquipe(equipeId?: string) {
  return useQuery<ChallengeEquipeResponse>({
    queryKey: ["challenge", "equipe", equipeId],
    queryFn: () => fetchChallengeByEquipe(equipeId!),
    enabled: !!equipeId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
