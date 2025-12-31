import { useQuery } from "@tanstack/react-query";
import { fetchChallengeAll, type ChallengeAllResponse } from "../api/challenge";
import { useSelectedTeam } from "../providers/SelectedTeamProvider";

export function useChallengeAll() {
  const { selectedTeam } = useSelectedTeam();
  const teamId = selectedTeam?.id ?? null;
  return useQuery<ChallengeAllResponse>({
    queryKey: ["challenge", "all", teamId],
    queryFn: () => fetchChallengeAll({ teamId }),
  });
}
