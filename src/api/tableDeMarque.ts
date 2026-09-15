import { getApiBaseUrl } from './env';
import { fetchWithRetry } from './fetchWithRetry';

function tdmUrl(path: string): string {
  return `${getApiBaseUrl()}/table-de-marque/matches${path}`;
}

export type MatchLiveEtat =
  | 'PLANIFIE'
  | 'ANNONCE'
  | 'EN_COURS'
  | 'EN_PAUSE'
  | 'TERMINE';

export type MatchLiveState = {
  numMatch: number;
  etat: MatchLiveEtat;
  tempsEcouleSecondes: number;
  chronoEnCours: boolean;
  chronoDerniereMajAt: string | null;
  score1Cache: number;
  score2Cache: number;
  createdAt: string;
  updatedAt: string;
};

export type MatchBut = {
  id: number;
  numMatch: number;
  equipeId: number;
  buteurId: number;
  assist1Id: number | null;
  assist2Id: number | null;
  tempsJeuSecondes: number;
  createdAt: string;
};

export type MatchPenaliteActive = {
  id: number;
  numMatch: number;
  equipeId: number;
  joueurId: number;
  typePenaliteCode: string;
  dureeMinutes: number;
  tempsJeuDebut: number;
  createdAt: string;
  active: boolean;
};

export type MatchLiveDetail = {
  matchLive: MatchLiveState;
  buts: MatchBut[];
  penalites: MatchPenaliteActive[];
};

export type JoueurInfo = {
  id: number;
  nom: string;
  prenom: string;
  numero: number;
  poste: string;
};

export type CoachInfo = {
  id: number;
  nom: string;
  prenom: string;
};

export type EquipeEffectifs = {
  equipeId: number;
  nom: string;
  joueurs: JoueurInfo[];
  coachs: CoachInfo[];
};

export type EffectifsMatch = {
  equipe1: EquipeEffectifs;
  equipe2: EquipeEffectifs;
};

export type AjouterButPayload = {
  equipeId: number;
  buteurId: number;
  assist1Id?: number | null;
  assist2Id?: number | null;
  tempsJeuSecondes: number;
};

export type AjouterPenalitePayload = {
  equipeId: number;
  joueurId: number;
  typePenaliteCode: string;
  dureeMinutes: number;
  tempsJeuDebut: number;
};

export async function fetchMatchLive(numMatch: number): Promise<MatchLiveDetail> {
  const res = await fetchWithRetry(tdmUrl(`/${numMatch}/live`));
  return res.json() as Promise<MatchLiveDetail>;
}

export async function fetchEffectifsMatch(numMatch: number): Promise<EffectifsMatch> {
  const res = await fetchWithRetry(tdmUrl(`/${numMatch}/effectifs`));
  return res.json() as Promise<EffectifsMatch>;
}

async function writeAction(
  url: string,
  method: string,
  token: string,
  body?: unknown,
): Promise<Response> {
  return fetchWithRetry(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

export async function annoncerMatch(numMatch: number, token: string): Promise<MatchLiveState> {
  const res = await writeAction(tdmUrl(`/${numMatch}/annoncer`), 'POST', token);
  return res.json() as Promise<MatchLiveState>;
}

export async function demarrerMatch(numMatch: number, token: string): Promise<MatchLiveState> {
  const res = await writeAction(tdmUrl(`/${numMatch}/demarrer`), 'POST', token);
  return res.json() as Promise<MatchLiveState>;
}

export async function pauserMatch(numMatch: number, token: string): Promise<MatchLiveState> {
  const res = await writeAction(tdmUrl(`/${numMatch}/pauser`), 'POST', token);
  return res.json() as Promise<MatchLiveState>;
}

export async function terminerMatch(numMatch: number, token: string): Promise<MatchLiveState> {
  const res = await writeAction(tdmUrl(`/${numMatch}/terminer`), 'POST', token);
  return res.json() as Promise<MatchLiveState>;
}

export async function editerChrono(
  numMatch: number,
  tempsEcouleSecondes: number,
  token: string,
): Promise<MatchLiveState> {
  const res = await writeAction(tdmUrl(`/${numMatch}/chrono`), 'PATCH', token, {
    tempsEcouleSecondes,
  });
  return res.json() as Promise<MatchLiveState>;
}

export async function ajouterBut(
  numMatch: number,
  payload: AjouterButPayload,
  token: string,
): Promise<MatchLiveState> {
  const res = await writeAction(tdmUrl(`/${numMatch}/buts`), 'POST', token, payload);
  return res.json() as Promise<MatchLiveState>;
}

export async function supprimerBut(
  numMatch: number,
  id: number,
  token: string,
): Promise<MatchLiveState> {
  const res = await writeAction(tdmUrl(`/${numMatch}/buts/${id}`), 'DELETE', token);
  return res.json() as Promise<MatchLiveState>;
}

export async function ajouterPenalite(
  numMatch: number,
  payload: AjouterPenalitePayload,
  token: string,
): Promise<MatchPenaliteActive> {
  const res = await writeAction(tdmUrl(`/${numMatch}/penalites`), 'POST', token, payload);
  return res.json() as Promise<MatchPenaliteActive>;
}

export async function supprimerPenalite(
  numMatch: number,
  id: number,
  token: string,
): Promise<void> {
  await writeAction(tdmUrl(`/${numMatch}/penalites/${id}`), 'DELETE', token);
}
