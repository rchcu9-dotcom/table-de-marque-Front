import { useQuery } from "@tanstack/react-query";
import { fetchMatches, fetchMatchById, fetchMomentumMatches } from "../api/match";
export function useMatches() {
    return useQuery({
        queryKey: ["matches"],
        queryFn: fetchMatches,
    });
}
export function useMatch(id) {
    return useQuery({
        queryKey: ["matches", id],
        queryFn: () => fetchMatchById(id),
        enabled: !!id,
    });
}
export function useMomentumMatches() {
    return useQuery({
        queryKey: ["matches", "momentum"],
        queryFn: fetchMomentumMatches,
    });
}
