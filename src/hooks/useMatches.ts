import { useQuery } from "@tanstack/react-query";
import type { Match } from "../api/match";
import { fetchMatches, fetchMatchById } from "../api/match";

export function useMatches() {
  return useQuery<Match[]>({
    queryKey: ["matches"],
    queryFn: fetchMatches,
  });
}

export function useMatch(id: string | undefined) {
  return useQuery<Match>({
    queryKey: ["matches", id],
    queryFn: () => fetchMatchById(id!),
    enabled: !!id,
  });
}
