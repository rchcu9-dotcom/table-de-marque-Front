import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ouvrirInscriptions, cloturerInscriptions } from '../api/inscription';
import { ServerError } from '../api/errors';
import { EDITION_QUERY_KEY } from './useInscriptionSession';
import { EDITION_EN_PREPARATION_QUERY_KEY } from './useEditionEnPreparation';

export type ActionInscriptions = 'ouvrir' | 'cloturer';

export const MESSAGE_CONFLIT_ETAT =
  "L'état des inscriptions a changé entre-temps";

/**
 * Transitions du switch « Inscriptions ouvertes / fermées ». L'état affiché
 * reste celui du serveur : on invalide les deux caches d'édition (passer de
 * CREATION_NOUVEAU_TOURNOI à INSCRIPTIONS_OUVERTES fait basculer l'édition de
 * « en préparation » à « active »), y compris après un 409 pour resynchroniser.
 */
export function useChangerEtapeInscriptions(editionId: number, token: string) {
  const queryClient = useQueryClient();

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: EDITION_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: EDITION_EN_PREPARATION_QUERY_KEY }),
    ]);

  return useMutation({
    mutationFn: (action: ActionInscriptions) =>
      action === 'ouvrir'
        ? ouvrirInscriptions(editionId, token)
        : cloturerInscriptions(editionId, token),
    onSuccess: invalidate,
    onError: (error) => {
      if (error instanceof ServerError && error.status === 409) {
        void invalidate();
      }
    },
  });
}

export function estConflitEtat(error: unknown): boolean {
  return error instanceof ServerError && error.status === 409;
}
