import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Match, MatchFilters } from "../api/match";
import { fetchMatches, fetchMatchById, fetchMomentumMatches } from "../api/match";

export function useMatches() {
  return useQuery<Match[]>({
    queryKey: ["matches"],
    queryFn: () => fetchMatches(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useMatch(id: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery<Match>({
    queryKey: ["matches", id],
    queryFn: () => fetchMatchById(id!),
    enabled: !!id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: () => {
      if (!id) return undefined;
      const list = queryClient.getQueryData<Match[]>(["matches"]) ?? [];
      return list.find((m) => m.id === id);
    },
  });
}

export function useMomentumMatches(filters: MatchFilters = {}) {
  return useQuery<Match[]>({
    queryKey: ["matches", "momentum", filters],
    queryFn: () => fetchMomentumMatches(filters),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useMatchesFiltered(filters: MatchFilters) {
  return useQuery<Match[]>({
    queryKey: ["matches", filters],
    queryFn: () => fetchMatches(filters),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
