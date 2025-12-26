import { useQuery } from "@tanstack/react-query";
import type { PouleClassement } from "../api/classement";
import { fetchClassementByMatch, fetchClassementByPoule } from "../api/classement";

export function useClassement(code: string, phase?: string) {
  return useQuery<PouleClassement>({
    queryKey: ["classement", code, phase],
    queryFn: () => fetchClassementByPoule(code, phase),
    enabled: !!code,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useClassementForMatch(matchId: string | undefined) {
  return useQuery<PouleClassement>({
    queryKey: ["classement", "match", matchId],
    queryFn: () => fetchClassementByMatch(matchId!),
    enabled: !!matchId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
