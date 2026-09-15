import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ajouterAnneeAge, retirerAnneeAge } from '../api/inscription';
import { EDITION_QUERY_KEY } from './useInscriptionSession';
import { EDITION_EN_PREPARATION_QUERY_KEY } from './useEditionEnPreparation';

/**
 * Le bloc "années d'âge" est monté aussi bien pour l'édition active que pour
 * une édition en préparation (ParametresInscriptionPage : edition =
 * editionEnPreparation ?? editionActive) — on invalide les deux caches par
 * simplicité plutôt que de deviner laquelle des deux vient d'être modifiée.
 */
function invalidateEditions(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: EDITION_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: EDITION_EN_PREPARATION_QUERY_KEY });
}

export function useAjouterAnneeAge(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (annee: number) => ajouterAnneeAge(editionId, annee, token),
    onSuccess: () => invalidateEditions(queryClient),
  });
}

export function useRetirerAnneeAge(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (annee: number) => retirerAnneeAge(editionId, annee, token),
    onSuccess: () => invalidateEditions(queryClient),
  });
}
