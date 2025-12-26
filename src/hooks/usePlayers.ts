import { useQuery } from "@tanstack/react-query";
import { fetchJoueursByEquipe, Joueur } from "../api/joueur";

export function usePlayersByEquipe(equipeId: string | undefined) {
  return useQuery<Joueur[]>({
    queryKey: ["joueurs", equipeId],
    queryFn: () => fetchJoueursByEquipe(equipeId!),
    enabled: !!equipeId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
