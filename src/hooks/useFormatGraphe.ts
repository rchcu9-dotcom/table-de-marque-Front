import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchFormatGraphe,
  creerPhase,
  modifierPhase,
  supprimerPhase,
  reordonnerPhases,
  creerGroupe,
  modifierGroupe,
  supprimerGroupe,
  ajouterPlaceAlias,
  supprimerPlace,
  definirLien,
  marquerElimine,
  reinitialiserLien,
  associerPhaseJour,
  dissocierPhaseJour,
  genererPreset,
  type GenererPresetPayload,
  type FormatGroupeFormule,
} from '../api/formatGraphe';

export function formatGrapheQueryKey(editionId: number) {
  return ['format-graphe', editionId] as const;
}

export function useFormatGraphe(
  editionId: number | undefined,
  token: string | null,
) {
  return useQuery({
    queryKey: formatGrapheQueryKey(editionId ?? 0),
    queryFn: () => fetchFormatGraphe(editionId!, token!),
    enabled: editionId !== undefined && !!token,
    staleTime: 30_000,
  });
}

// ─── Phases ───────────────────────────────────────────────────────────────────

export function useCreerPhase(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { nom: string; ordre: number }) =>
      creerPhase(editionId, payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: formatGrapheQueryKey(editionId),
      });
    },
  });
}

export function useModifierPhase(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      phaseId,
      payload,
    }: {
      phaseId: number;
      payload: { nom: string };
    }) => modifierPhase(editionId, phaseId, payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: formatGrapheQueryKey(editionId),
      });
    },
  });
}

export function useSupprimerPhase(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (phaseId: number) => supprimerPhase(editionId, phaseId, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: formatGrapheQueryKey(editionId),
      });
    },
  });
}

export function useReordonnerPhases(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ordreIds: number[]) =>
      reordonnerPhases(editionId, ordreIds, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: formatGrapheQueryKey(editionId),
      });
    },
  });
}

// ─── Groupes ──────────────────────────────────────────────────────────────────

export function useCreerGroupe(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      phaseId,
      payload,
    }: {
      phaseId: number;
      payload: { nom: string };
    }) => creerGroupe(editionId, phaseId, payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: formatGrapheQueryKey(editionId),
      });
    },
  });
}

export function useModifierGroupe(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupeId,
      payload,
    }: {
      groupeId: number;
      payload: { nom?: string; formule?: FormatGroupeFormule };
    }) => modifierGroupe(editionId, groupeId, payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: formatGrapheQueryKey(editionId),
      });
    },
  });
}

export function useSupprimerGroupe(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupeId: number) =>
      supprimerGroupe(editionId, groupeId, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: formatGrapheQueryKey(editionId),
      });
    },
  });
}

// ─── Places ───────────────────────────────────────────────────────────────────

export function useAjouterPlaceAlias(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupeId,
      aliasLabel,
    }: {
      groupeId: number;
      aliasLabel: string;
    }) => ajouterPlaceAlias(editionId, groupeId, { aliasLabel }, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: formatGrapheQueryKey(editionId),
      });
    },
  });
}

export function useSupprimerPlace(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (placeId: number) => supprimerPlace(editionId, placeId, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: formatGrapheQueryKey(editionId),
      });
    },
  });
}

// ─── Liens ────────────────────────────────────────────────────────────────────

export function useDefinirLien(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupeSourceId,
      rangSource,
      groupeCibleId,
    }: {
      groupeSourceId: number;
      rangSource: number;
      groupeCibleId: number;
    }) => definirLien(editionId, groupeSourceId, rangSource, groupeCibleId, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: formatGrapheQueryKey(editionId),
      });
    },
  });
}

export function useMarquerElimine(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupeSourceId,
      rangSource,
    }: {
      groupeSourceId: number;
      rangSource: number;
    }) => marquerElimine(editionId, groupeSourceId, rangSource, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: formatGrapheQueryKey(editionId),
      });
    },
  });
}

export function useReinitialiserLien(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupeSourceId,
      rangSource,
    }: {
      groupeSourceId: number;
      rangSource: number;
    }) => reinitialiserLien(editionId, groupeSourceId, rangSource, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: formatGrapheQueryKey(editionId),
      });
    },
  });
}

// ─── Phase ↔ Jour ─────────────────────────────────────────────────────────────

export function useAssocierPhaseJour(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      phaseId,
      editionJourId,
    }: {
      phaseId: number;
      editionJourId: number;
    }) => associerPhaseJour(editionId, phaseId, editionJourId, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: formatGrapheQueryKey(editionId),
      });
    },
  });
}

export function useDissocierPhaseJour(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      phaseId,
      editionJourId,
    }: {
      phaseId: number;
      editionJourId: number;
    }) => dissocierPhaseJour(editionId, phaseId, editionJourId, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: formatGrapheQueryKey(editionId),
      });
    },
  });
}

// ─── Preset ───────────────────────────────────────────────────────────────────

export function useGenererPreset(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenererPresetPayload) =>
      genererPreset(editionId, payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: formatGrapheQueryKey(editionId),
      });
    },
  });
}
