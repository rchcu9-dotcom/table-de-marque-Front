import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchMatchLive,
  annoncerMatch,
  demarrerMatch,
  pauserMatch,
  terminerMatch,
  editerChrono,
  ajouterBut,
  supprimerBut,
  ajouterPenalite,
  supprimerPenalite,
  type AjouterButPayload,
  type AjouterPenalitePayload,
} from '../api/tableDeMarque';

export function matchLiveQueryKey(numMatch: number) {
  return ['match-live', numMatch] as const;
}

export function useMatchLive(numMatch: number | undefined) {
  return useQuery({
    queryKey: matchLiveQueryKey(numMatch ?? 0),
    queryFn: () => fetchMatchLive(numMatch!),
    enabled: numMatch !== undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

function useMatchLiveMutation<TVariables>(
  numMatch: number,
  mutationFn: (vars: TVariables) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchLiveQueryKey(numMatch) });
    },
  });
}

export function useAnnoncerMatch(numMatch: number) {
  return useMatchLiveMutation(numMatch, (token: string) =>
    annoncerMatch(numMatch, token),
  );
}

export function useDemarrerMatch(numMatch: number) {
  return useMatchLiveMutation(numMatch, (token: string) =>
    demarrerMatch(numMatch, token),
  );
}

export function usePauserMatch(numMatch: number) {
  return useMatchLiveMutation(numMatch, (token: string) =>
    pauserMatch(numMatch, token),
  );
}

export function useTerminerMatch(numMatch: number) {
  return useMatchLiveMutation(numMatch, (token: string) =>
    terminerMatch(numMatch, token),
  );
}

export function useEditerChrono(numMatch: number) {
  return useMatchLiveMutation(
    numMatch,
    ({ tempsEcouleSecondes, token }: { tempsEcouleSecondes: number; token: string }) =>
      editerChrono(numMatch, tempsEcouleSecondes, token),
  );
}

export function useAjouterBut(numMatch: number) {
  return useMatchLiveMutation(
    numMatch,
    ({ payload, token }: { payload: AjouterButPayload; token: string }) =>
      ajouterBut(numMatch, payload, token),
  );
}

export function useSupprimerBut(numMatch: number) {
  return useMatchLiveMutation(
    numMatch,
    ({ id, token }: { id: number; token: string }) =>
      supprimerBut(numMatch, id, token),
  );
}

export function useAjouterPenalite(numMatch: number) {
  return useMatchLiveMutation(
    numMatch,
    ({ payload, token }: { payload: AjouterPenalitePayload; token: string }) =>
      ajouterPenalite(numMatch, payload, token),
  );
}

export function useSupprimerPenalite(numMatch: number) {
  return useMatchLiveMutation(
    numMatch,
    ({ id, token }: { id: number; token: string }) =>
      supprimerPenalite(numMatch, id, token),
  );
}
