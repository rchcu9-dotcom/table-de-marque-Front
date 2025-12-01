import { useQuery } from "@tanstack/react-query";
import { fetchClassementByMatch, fetchClassementByPoule, } from "../api/classement";
const REFRESH_MS = 60_000;
export function useClassementByPoule(code) {
    return useQuery({
        queryKey: ["classement", "poule", code],
        queryFn: () => fetchClassementByPoule(code),
        enabled: !!code,
        staleTime: REFRESH_MS,
        refetchInterval: REFRESH_MS,
    });
}
export function useClassementForMatch(id) {
    return useQuery({
        queryKey: ["classement", "match", id],
        queryFn: () => fetchClassementByMatch(id),
        enabled: !!id,
        staleTime: REFRESH_MS,
        refetchInterval: REFRESH_MS,
    });
}
