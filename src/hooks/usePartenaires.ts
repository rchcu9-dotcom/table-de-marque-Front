import { useQuery } from "@tanstack/react-query";
import type { Partenaire } from "../api/partenaire";
import { fetchPartenaires } from "../api/partenaire";

export function usePartenaires() {
  return useQuery<Partenaire[]>({
    queryKey: ["partenaires"],
    queryFn: fetchPartenaires,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
