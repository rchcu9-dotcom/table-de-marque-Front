import { useQuery } from '@tanstack/react-query';
import { fetchEffectifsMatch } from '../api/tableDeMarque';

export function useEffectifsMatch(numMatch: number | undefined) {
  return useQuery({
    queryKey: ['effectifs', numMatch],
    queryFn: () => fetchEffectifsMatch(numMatch!),
    enabled: numMatch !== undefined,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}
