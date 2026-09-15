import { getApiBaseUrl } from './env';
import { fetchWithRetry } from './fetchWithRetry';

function url(path: string): string {
  return `${getApiBaseUrl()}/planning${path}`;
}

function authHeaders(token: string, hasBody: boolean): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
  };
}

export type PhaseCompetition = 'BRASSAGE' | 'QUALIFICATION' | 'FINALE';

export type EquipeSimulation = {
  ref: string;
  nom: string;
  fictive: boolean;
  equipeId: number | null;
};

export type MatchGenere = {
  numMatch: number;
  jour: number;
  matchCase: number;
  equipe1Ref: string;
  equipe1Nom: string;
  equipe2Ref: string;
  equipe2Nom: string;
  dateHeure: string;
  dureeMin: number;
  is3v3: boolean;
  poule: string | null;
  phase: PhaseCompetition;
};

export type ActiviteGeneree = {
  creneauId: number;
  activiteId: number;
  activiteLabel: string;
  equipeRef: string;
  equipeNom: string;
  debut: string;
  fin: string;
};

export type SimulationResult = {
  id: string;
  editionId: number;
  generatedAt: string;
  score: { penalty: number; slack: number };
  violations: string[];
  equipes: EquipeSimulation[];
  matches: MatchGenere[];
  activites: ActiviteGeneree[];
  mode: {
    parametresParDefautUtilises: string[];
    effectifComplete: boolean;
  };
};

export type ConfirmerPlanningResult = {
  nbMatchsCrees: number;
  nbActivitesCrees: number;
};

export async function simulerPlanning(
  editionId: number,
  nbEquipesCible: number | undefined,
  token: string,
): Promise<SimulationResult> {
  const res = await fetchWithRetry(url(`/${editionId}/simuler`), {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(nbEquipesCible != null ? { nbEquipesCible } : {}),
  });
  return res.json() as Promise<SimulationResult>;
}

export async function exporterSimulation(
  editionId: number,
  simulationId: string,
  token: string,
): Promise<string> {
  const res = await fetchWithRetry(
    url(`/${editionId}/simulation/${simulationId}/export`),
    { headers: authHeaders(token, false) },
  );
  return res.text();
}

export async function ajusterSimulation(
  editionId: number,
  simulationId: string,
  numMatch: number,
  payload: {
    dateHeure?: string;
    equipe1Ref?: string;
    equipe2Ref?: string;
    dureeMin?: number;
  },
  token: string,
): Promise<SimulationResult> {
  const res = await fetchWithRetry(
    url(`/${editionId}/simulation/${simulationId}/matchs/${numMatch}`),
    {
      method: 'PATCH',
      headers: authHeaders(token, true),
      body: JSON.stringify(payload),
    },
  );
  return res.json() as Promise<SimulationResult>;
}

export async function confirmerPlanning(
  editionId: number,
  forcerEquipesFictives: boolean,
  token: string,
): Promise<ConfirmerPlanningResult> {
  const res = await fetchWithRetry(url(`/${editionId}/confirmer`), {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify({ forcerEquipesFictives }),
  });
  return res.json() as Promise<ConfirmerPlanningResult>;
}

export async function fetchVerificationPlanning(
  editionId: number,
  token: string,
): Promise<string[]> {
  const res = await fetchWithRetry(url(`/${editionId}/verification`), {
    headers: authHeaders(token, false),
  });
  return res.json() as Promise<string[]>;
}
