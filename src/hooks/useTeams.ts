import { useQuery } from "@tanstack/react-query";
import type { Team } from "../api/team";
import { fetchTeamById, fetchTeams } from "../api/team";

export function useTeams() {
  return useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: fetchTeams,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useTeam(id: string | undefined) {
  return useQuery<Team>({
    queryKey: ["teams", id],
    queryFn: () => fetchTeamById(id!),
    enabled: !!id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
