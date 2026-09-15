import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchActivitesCatalogue,
  createActiviteCatalogue,
  updateActiviteCatalogue,
  deleteActiviteCatalogue,
  type UpsertActiviteCataloguePayload,
} from '../api/parametresSportifs';
import { creneauxActiviteQueryKey } from './useCreneauxActivite';

export function activitesCatalogueQueryKey(editionId: number) {
  return ['activites-catalogue', editionId] as const;
}

export function useActivitesCatalogue(editionId: number | undefined, token: string | null) {
  return useQuery({
    queryKey: activitesCatalogueQueryKey(editionId ?? 0),
    queryFn: () => fetchActivitesCatalogue(editionId!, token!),
    enabled: editionId !== undefined && !!token,
    staleTime: 60_000,
  });
}

export function useCreateActiviteCatalogue(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertActiviteCataloguePayload) =>
      createActiviteCatalogue(editionId, payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: activitesCatalogueQueryKey(editionId),
      });
    },
  });
}

export function useUpdateActiviteCatalogue(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpsertActiviteCataloguePayload }) =>
      updateActiviteCatalogue(editionId, id, payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: activitesCatalogueQueryKey(editionId),
      });
    },
  });
}

export function useDeleteActiviteCatalogue(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteActiviteCatalogue(editionId, id, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: activitesCatalogueQueryKey(editionId),
      });
      // Suppression en cascade côté back (§2.2 de la spec) : les créneaux de
      // l'activité supprimée disparaissent aussi, sans confirmation.
      void queryClient.invalidateQueries({
        queryKey: creneauxActiviteQueryKey(editionId),
      });
    },
  });
}
