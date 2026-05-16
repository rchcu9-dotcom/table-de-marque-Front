import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Match, MatchFilters } from "../api/match";
import { fetchMatches, fetchMatchById } from "../api/match";

function filterMatches(matches: Match[], filters: MatchFilters): Match[] {
  let result = matches;
  if (filters.competitionType) {
    result = result.filter((m) => (m.competitionType ?? "5v5") === filters.competitionType);
  }
  if (filters.surface) {
    result = result.filter((m) => m.surface === filters.surface);
  }
  if (filters.teamId) {
    const tid = filters.teamId.toLowerCase();
    result = result.filter(
      (m) => m.teamA?.toLowerCase() === tid || m.teamB?.toLowerCase() === tid,
    );
  }
  if (filters.status) {
    result = result.filter((m) => m.status === filters.status);
  }
  if (filters.jour) {
    result = result.filter((m) => m.jour === filters.jour);
  }
  return result;
}

const MATCHES_BASE = {
  queryKey: ["matches"] as const,
  queryFn: () => fetchMatches(),
  staleTime: 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: "always" as const,
};

export function useMatches() {
  return useQuery<Match[]>(MATCHES_BASE);
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
  const { competitionType, surface, teamId, status, jour } = filters;
  const select = React.useCallback(
    (matches: Match[]) => filterMatches(matches, { competitionType, surface, teamId, status, jour }),
    [competitionType, surface, teamId, status, jour],
  );
  return useQuery<Match[], Error, Match[]>({ ...MATCHES_BASE, select });
}

export function useMatchesFiltered(filters: MatchFilters) {
  const { competitionType, surface, teamId, status, jour } = filters;
  const select = React.useCallback(
    (matches: Match[]) => filterMatches(matches, { competitionType, surface, teamId, status, jour }),
    [competitionType, surface, teamId, status, jour],
  );
  return useQuery<Match[], Error, Match[]>({ ...MATCHES_BASE, select });
}
