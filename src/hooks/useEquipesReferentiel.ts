import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchEquipesReferentielToutes,
  activerEquipeReferentiel,
  desactiverEquipeReferentiel,
  createEquipeDemande,
  modifierEquipeReferentiel,
} from '../api/inscription';
import type { ModificationEquipe } from '../api/types/inscription.types';

export const EQUIPES_REFERENTIEL_TOUTES_QUERY_KEY = ['equipes-referentiel', 'toutes'] as const;

export function useEquipesReferentielToutes(token: string | null) {
  return useQuery({
    queryKey: EQUIPES_REFERENTIEL_TOUTES_QUERY_KEY,
    queryFn: () => fetchEquipesReferentielToutes(token!),
    enabled: !!token,
    staleTime: 30_000,
  });
}

export function useActiverEquipeReferentiel(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => activerEquipeReferentiel(id, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EQUIPES_REFERENTIEL_TOUTES_QUERY_KEY });
    },
  });
}

export function useDesactiverEquipeReferentiel(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => desactiverEquipeReferentiel(id, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EQUIPES_REFERENTIEL_TOUTES_QUERY_KEY });
    },
  });
}

export function useModifierEquipeReferentiel(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ModificationEquipe }) =>
      modifierEquipeReferentiel(id, data, token),
    // Aussi après un refus : un renommage bloqué par une candidature arrivée
    // entre-temps doit faire apparaître la ligne verrouillée.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: EQUIPES_REFERENTIEL_TOUTES_QUERY_KEY });
    },
  });
}

export function useCreerEquipeReferentiel(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { nom: string; nomComplet?: string }) => createEquipeDemande(data, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EQUIPES_REFERENTIEL_TOUTES_QUERY_KEY });
    },
  });
}
