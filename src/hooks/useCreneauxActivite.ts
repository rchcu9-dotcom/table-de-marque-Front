import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCreneauxActivite,
  createCreneauActivite,
  updateCreneauActivite,
  deleteCreneauActivite,
  type UpsertCreneauActivitePayload,
} from '../api/parametresSportifs';

export function creneauxActiviteQueryKey(editionId: number) {
  return ['creneaux-activite', editionId] as const;
}

export function useCreneauxActivite(editionId: number | undefined, token: string | null) {
  return useQuery({
    queryKey: creneauxActiviteQueryKey(editionId ?? 0),
    queryFn: () => fetchCreneauxActivite(editionId!, token!),
    enabled: editionId !== undefined && !!token,
    staleTime: 60_000,
  });
}

export function useCreateCreneauActivite(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertCreneauActivitePayload) =>
      createCreneauActivite(editionId, payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: creneauxActiviteQueryKey(editionId),
      });
    },
  });
}

export function useUpdateCreneauActivite(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpsertCreneauActivitePayload }) =>
      updateCreneauActivite(editionId, id, payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: creneauxActiviteQueryKey(editionId),
      });
    },
  });
}

export function useDeleteCreneauActivite(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCreneauActivite(editionId, id, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: creneauxActiviteQueryKey(editionId),
      });
    },
  });
}
