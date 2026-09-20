import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadImageRib, deleteImageRib } from '../api/inscription';
import { EDITION_QUERY_KEY } from './useInscriptionSession';
import { EDITION_EN_PREPARATION_QUERY_KEY } from './useEditionEnPreparation';

/**
 * L'édition modifiée depuis ParametresInscriptionPage peut être l'édition
 * active ou celle en préparation (cycle annuel) — invalide les deux clés
 * sans se soucier de laquelle est réellement affectée.
 */
function invalidateEditionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: EDITION_QUERY_KEY });
  void queryClient.invalidateQueries({
    queryKey: EDITION_EN_PREPARATION_QUERY_KEY,
  });
}

export function useUploadImageRib(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadImageRib(editionId, file, token),
    onSuccess: () => invalidateEditionQueries(queryClient),
  });
}

export function useDeleteImageRib(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteImageRib(editionId, token),
    onSuccess: () => invalidateEditionQueries(queryClient),
  });
}
