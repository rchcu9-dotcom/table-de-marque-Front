import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEdition, type UpdateEditionPayload } from '../api/inscription';
import { EDITION_QUERY_KEY } from './useInscriptionSession';

export function useUpdateEdition(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateEditionPayload) =>
      updateEdition(editionId, payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EDITION_QUERY_KEY });
    },
  });
}
