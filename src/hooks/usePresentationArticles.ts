import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchPresentationArticles,
  createPresentationArticle,
  updatePresentationArticle,
  deletePresentationArticle,
  deplacerPresentationArticle,
  updatePresentationGroupe,
  deplacerPresentationGroupe,
  deletePresentationGroupe,
  type UpsertPresentationArticlePayload,
  type UpdatePresentationGroupePayload,
  type DeplacerDirection,
} from '../api/presentation';
import { PRESENTATION_QUERY_KEY } from './usePresentation';

export const PRESENTATION_ARTICLES_QUERY_KEY = ['presentation-articles'] as const;

export function usePresentationArticles(token: string | null) {
  return useQuery({
    queryKey: PRESENTATION_ARTICLES_QUERY_KEY,
    queryFn: () => fetchPresentationArticles(token!),
    enabled: !!token,
    staleTime: 30_000,
  });
}

// Les écritures republient aussi le cache public côté back (voir presentation.controller) :
// invalider PRESENTATION_QUERY_KEY ici permet à un onglet Présentation déjà ouvert de
// refléter la modification au prochain focus, sans attendre son propre staleTime.
export function useCreatePresentationArticle(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertPresentationArticlePayload) =>
      createPresentationArticle(payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRESENTATION_ARTICLES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PRESENTATION_QUERY_KEY });
    },
  });
}

export function useUpdatePresentationArticle(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpsertPresentationArticlePayload }) =>
      updatePresentationArticle(id, payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRESENTATION_ARTICLES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PRESENTATION_QUERY_KEY });
    },
  });
}

export function useDeletePresentationArticle(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePresentationArticle(id, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRESENTATION_ARTICLES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PRESENTATION_QUERY_KEY });
    },
  });
}

export function useDeplacerPresentationArticle(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, direction }: { id: number; direction: DeplacerDirection }) =>
      deplacerPresentationArticle(id, direction, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRESENTATION_ARTICLES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PRESENTATION_QUERY_KEY });
    },
  });
}

export function useUpdatePresentationGroupe(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupe,
      payload,
    }: {
      groupe: string;
      payload: UpdatePresentationGroupePayload;
    }) => updatePresentationGroupe(groupe, payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRESENTATION_ARTICLES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PRESENTATION_QUERY_KEY });
    },
  });
}

export function useDeplacerPresentationGroupe(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupe, direction }: { groupe: string; direction: DeplacerDirection }) =>
      deplacerPresentationGroupe(groupe, direction, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRESENTATION_ARTICLES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PRESENTATION_QUERY_KEY });
    },
  });
}

export function useDeletePresentationGroupe(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupe: string) => deletePresentationGroupe(groupe, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRESENTATION_ARTICLES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PRESENTATION_QUERY_KEY });
    },
  });
}
