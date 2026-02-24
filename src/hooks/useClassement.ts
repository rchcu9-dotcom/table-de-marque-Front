import { useQuery } from "@tanstack/react-query";
import type { J3FinalSquaresResponse, PouleClassement } from "../api/classement";
import {
  fetchClassementByMatch,
  fetchClassementByPoule,
  fetchJ3FinalSquares,
} from "../api/classement";

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

export function useJ3FinalSquares() {
  return useQuery<J3FinalSquaresResponse>({
    queryKey: ["classement", "j3", "carres"],
    queryFn: fetchJ3FinalSquares,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
