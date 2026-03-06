import { useQuery } from "@tanstack/react-query";
import { fetchChallengeVitesseJ3, type ChallengeVitesseJ3Response } from "../api/challenge";

export function useChallengeVitesseJ3() {
  return useQuery<ChallengeVitesseJ3Response>({
    queryKey: ["challenge", "vitesse", "j3"],
    queryFn: fetchChallengeVitesseJ3,
    staleTime: 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}
