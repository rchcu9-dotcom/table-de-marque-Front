import { useQuery } from '@tanstack/react-query';
import { fetchPresentation } from '../api/presentation';

export const PRESENTATION_QUERY_KEY = ['presentation'] as const;

export function usePresentation() {
  return useQuery({
    queryKey: PRESENTATION_QUERY_KEY,
    queryFn: fetchPresentation,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
