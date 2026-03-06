import { useQuery } from "@tanstack/react-query";
import { fetchMeals, type MealsResponse } from "../api/meals";

export function useMeals() {
  return useQuery<MealsResponse>({
    queryKey: ["meals"],
    queryFn: () => fetchMeals(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
