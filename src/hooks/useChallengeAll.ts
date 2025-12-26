import { useQuery } from "@tanstack/react-query";
import { fetchChallengeAll, type ChallengeAllResponse } from "../api/challenge";

export function useChallengeAll() {
  return useQuery<ChallengeAllResponse>({
    queryKey: ["challenge", "all"],
    queryFn: fetchChallengeAll,
  });
}
