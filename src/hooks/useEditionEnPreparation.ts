import { useQuery } from '@tanstack/react-query';
import { fetchEditionEnPreparation } from '../api/inscription';
import type { Edition } from '../api/types/inscription.types';

export const EDITION_EN_PREPARATION_QUERY_KEY = ['inscription', 'edition-en-preparation'] as const;

/**
 * Édition en cours de préparation pour la saison suivante (cycle annuel de
 * l'édition, spec §3) — admin-only, `null` tant qu'aucun cycle de
 * renouvellement n'a été démarré depuis AdminPage.
 */
export function useEditionEnPreparation(token: string | null) {
  return useQuery<Edition | null>({
    queryKey: EDITION_EN_PREPARATION_QUERY_KEY,
    queryFn: () => fetchEditionEnPreparation(token!),
    enabled: !!token,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
