import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchEditionJours,
  upsertEditionJour,
  deleteEditionJour,
  type UpsertJourPayload,
} from '../api/parametresSportifs';

export function editionJoursQueryKey(editionId: number) {
  return ['edition-jours', editionId] as const;
}

export function useEditionJours(editionId: number | undefined, token: string | null) {
  return useQuery({
    queryKey: editionJoursQueryKey(editionId ?? 0),
    queryFn: () => fetchEditionJours(editionId!, token!),
    enabled: editionId !== undefined && !!token,
    staleTime: 60_000,
  });
}

export function useUpsertEditionJour(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertJourPayload) =>
      upsertEditionJour(editionId, payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: editionJoursQueryKey(editionId),
      });
    },
  });
}

export function useDeleteEditionJour(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (numeroJour: number) =>
      deleteEditionJour(editionId, numeroJour, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: editionJoursQueryKey(editionId),
      });
    },
  });
}
