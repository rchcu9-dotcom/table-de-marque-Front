import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEdition, type UpdateEditionPayload } from '../api/inscription';
import { EDITION_QUERY_KEY } from './useInscriptionSession';
import { EDITION_EN_PREPARATION_QUERY_KEY } from './useEditionEnPreparation';
import { estConflitEtat } from './useChangerEtapeEdition';

export function useUpdateEdition(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateEditionPayload) =>
      updateEdition(editionId, payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EDITION_QUERY_KEY });
    },
    // 409 : l'étape a changé entre-temps (paramètres figés) → resynchroniser
    // l'édition affichée, qui peut être l'active ou celle en préparation.
    onError: (error) => {
      if (estConflitEtat(error)) {
        void queryClient.invalidateQueries({ queryKey: EDITION_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: EDITION_EN_PREPARATION_QUERY_KEY });
      }
    },
  });
}
