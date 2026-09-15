import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  simulerPlanning,
  confirmerPlanning,
  ajusterSimulation,
  exporterSimulation,
  type SimulationResult,
} from '../api/planning';

export function planningSimulationQueryKey(editionId: number) {
  return ['planning-simulation', editionId] as const;
}

/**
 * Résultat de la dernière simulation, tenu en cache TanStack Query côté client
 * (jamais persisté côté serveur au-delà de la requête HTTP, cf. D14 —
 * relancer une simulation remplace simplement la précédente).
 */
export function usePlanningSimulationState(editionId: number) {
  return useQuery({
    queryKey: planningSimulationQueryKey(editionId),
    queryFn: () => Promise.resolve(null as SimulationResult | null),
    enabled: false,
    staleTime: Infinity,
  });
}

export function useSimulerPlanning(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nbEquipesCible?: number) =>
      simulerPlanning(editionId, nbEquipesCible, token),
    onSuccess: (result) => {
      queryClient.setQueryData(planningSimulationQueryKey(editionId), result);
    },
  });
}

export function useAjusterSimulation(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      simulationId,
      numMatch,
      payload,
    }: {
      simulationId: string;
      numMatch: number;
      payload: {
        dateHeure?: string;
        equipe1Ref?: string;
        equipe2Ref?: string;
        dureeMin?: number;
      };
    }) => ajusterSimulation(editionId, simulationId, numMatch, payload, token),
    onSuccess: (result) => {
      queryClient.setQueryData(planningSimulationQueryKey(editionId), result);
    },
  });
}

export function useConfirmerPlanning(editionId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (forcerEquipesFictives: boolean) =>
      confirmerPlanning(editionId, forcerEquipesFictives, token),
    onSuccess: () => {
      queryClient.setQueryData(planningSimulationQueryKey(editionId), null);
    },
  });
}

export function useExporterSimulation(editionId: number, token: string) {
  return useMutation({
    mutationFn: (simulationId: string) =>
      exporterSimulation(editionId, simulationId, token),
  });
}
