import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ServerError } from '../api/errors';
import { EDITION_QUERY_KEY } from './useInscriptionSession';
import { EDITION_EN_PREPARATION_QUERY_KEY } from './useEditionEnPreparation';
import { estConflitEtat } from './useChangerEtapeEdition';

/**
 * Pages de réglages à nombreuses mutations (paramètres sportifs, format de
 * compétition) : un 409 signifie que l'étape de l'édition a changé depuis
 * l'ouverture de la page (formule figée). On renvoie l'erreur pour afficher le
 * message du back et on resynchronise l'édition, ce qui bascule la page en
 * lecture seule.
 */
export function useConflitVerrou(errors: unknown[]): ServerError | null {
  const queryClient = useQueryClient();
  const conflit = (errors.find(estConflitEtat) as ServerError | undefined) ?? null;

  useEffect(() => {
    if (conflit) {
      void queryClient.invalidateQueries({ queryKey: EDITION_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: EDITION_EN_PREPARATION_QUERY_KEY });
    }
  }, [conflit, queryClient]);

  return conflit;
}
