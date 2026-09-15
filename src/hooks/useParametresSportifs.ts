import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchParametresSportifs,
  updateParametresSportifs,
  type UpdateParametresSportifsPayload,
} from '../api/parametresSportifs';

export function parametresSportifsQueryKey(editionId: number) {
  return ['parametres-sportifs', editionId] as const;
}

export function useParametresSportifs(editionId: number | undefined, token: string | null) {
  return useQuery({
    queryKey: parametresSportifsQueryKey(editionId ?? 0),
    queryFn: () => fetchParametresSportifs(editionId!, token!),
    enabled: editionId !== undefined && !!token,
    staleTime: 60_000,
  });
}

export function useUpdateParametresSportifs(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateParametresSportifsPayload) =>
      updateParametresSportifs(editionId, payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: parametresSportifsQueryKey(editionId),
      });
    },
  });
}
