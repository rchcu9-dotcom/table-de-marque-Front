import { getApiBaseUrl } from './env';
import { fetchWithRetry } from './fetchWithRetry';

function url(path: string): string {
  return `${getApiBaseUrl()}/format-graphe${path}`;
}

// ─── Types miroir des entités backend ─────────────────────────────────────────

export type FormatLienEtat = 'NON_DEFINI' | 'ELIMINE' | 'LIE';
export type FormatPlaceOrigine = 'ALIAS' | 'LIEE';
export type FormatPhaseFinale =
  | 'ELIMINATION_DIRECTE'
  | 'POULES_FINALES'
  | 'CLASSEMENT_CROISE';
export type FormatGroupeFormule = 'CHAMPIONNAT' | 'RONDE_SUISSE';

export type FormatPlace = {
  id: number;
  groupeId: number;
  position: number;
  origine: FormatPlaceOrigine;
  aliasLabel: string | null;
  lienEntrantId: number | null;
};

export type FormatLien = {
  id: number;
  groupeSourceId: number;
  rangSource: number;
  etat: FormatLienEtat;
  groupeCibleId: number | null;
  placeCibleId: number | null;
};

export type FormatGroupe = {
  id: number;
  phaseId: number;
  nom: string;
  ordre: number;
  formule?: FormatGroupeFormule;
  places: FormatPlace[];
  liens: FormatLien[];
};

export type FormatPhase = {
  id: number;
  editionId: number;
  nom: string;
  ordre: number;
  joursIds: number[];
};

export type FormatGraphe = {
  editionId: number;
  phases: FormatPhase[];
  groupes: FormatGroupe[];
  liens: FormatLien[];
  modifieManuellement: boolean;
  genereDepuisPreset: FormatPhaseFinale | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(token: string, hasBody: boolean): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
  };
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function fetchFormatGraphe(
  editionId: number,
  token: string,
): Promise<FormatGraphe> {
  const res = await fetchWithRetry(url(`/${editionId}`), {
    headers: authHeaders(token, false),
  });
  return res.json() as Promise<FormatGraphe>;
}

// ─── Phases ───────────────────────────────────────────────────────────────────

export async function creerPhase(
  editionId: number,
  payload: { nom: string; ordre: number },
  token: string,
): Promise<FormatPhase> {
  const res = await fetchWithRetry(url(`/${editionId}/phases`), {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<FormatPhase>;
}

export async function modifierPhase(
  editionId: number,
  phaseId: number,
  payload: { nom: string },
  token: string,
): Promise<FormatPhase> {
  const res = await fetchWithRetry(url(`/${editionId}/phases/${phaseId}`), {
    method: 'PUT',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<FormatPhase>;
}

export async function supprimerPhase(
  editionId: number,
  phaseId: number,
  token: string,
): Promise<void> {
  await fetchWithRetry(url(`/${editionId}/phases/${phaseId}`), {
    method: 'DELETE',
    headers: authHeaders(token, false),
  });
}

export async function reordonnerPhases(
  editionId: number,
  ordreIds: number[],
  token: string,
): Promise<void> {
  await fetchWithRetry(url(`/${editionId}/phases/ordre`), {
    method: 'PUT',
    headers: authHeaders(token, true),
    body: JSON.stringify({ ordreIds }),
  });
}

// ─── Groupes ──────────────────────────────────────────────────────────────────

export async function creerGroupe(
  editionId: number,
  phaseId: number,
  payload: { nom: string },
  token: string,
): Promise<FormatGroupe> {
  const res = await fetchWithRetry(
    url(`/${editionId}/phases/${phaseId}/groupes`),
    {
      method: 'POST',
      headers: authHeaders(token, true),
      body: JSON.stringify(payload),
    },
  );
  return res.json() as Promise<FormatGroupe>;
}

export async function modifierGroupe(
  editionId: number,
  groupeId: number,
  payload: { nom?: string; formule?: FormatGroupeFormule },
  token: string,
): Promise<FormatGroupe> {
  const res = await fetchWithRetry(url(`/${editionId}/groupes/${groupeId}`), {
    method: 'PUT',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<FormatGroupe>;
}

export async function supprimerGroupe(
  editionId: number,
  groupeId: number,
  token: string,
): Promise<void> {
  await fetchWithRetry(url(`/${editionId}/groupes/${groupeId}`), {
    method: 'DELETE',
    headers: authHeaders(token, false),
  });
}

// ─── Places ───────────────────────────────────────────────────────────────────

export async function ajouterPlaceAlias(
  editionId: number,
  groupeId: number,
  payload: { aliasLabel: string },
  token: string,
): Promise<FormatPlace> {
  const res = await fetchWithRetry(
    url(`/${editionId}/groupes/${groupeId}/places`),
    {
      method: 'POST',
      headers: authHeaders(token, true),
      body: JSON.stringify(payload),
    },
  );
  return res.json() as Promise<FormatPlace>;
}

export async function supprimerPlace(
  editionId: number,
  placeId: number,
  token: string,
): Promise<void> {
  await fetchWithRetry(url(`/${editionId}/places/${placeId}`), {
    method: 'DELETE',
    headers: authHeaders(token, false),
  });
}

// ─── Liens ────────────────────────────────────────────────────────────────────

export async function definirLien(
  editionId: number,
  groupeSourceId: number,
  rangSource: number,
  groupeCibleId: number,
  token: string,
): Promise<FormatGraphe> {
  const res = await fetchWithRetry(
    url(`/${editionId}/groupes/${groupeSourceId}/liens/${rangSource}/cible`),
    {
      method: 'PUT',
      headers: authHeaders(token, true),
      body: JSON.stringify({ groupeCibleId }),
    },
  );
  return res.json() as Promise<FormatGraphe>;
}

export async function marquerElimine(
  editionId: number,
  groupeSourceId: number,
  rangSource: number,
  token: string,
): Promise<FormatGraphe> {
  const res = await fetchWithRetry(
    url(`/${editionId}/groupes/${groupeSourceId}/liens/${rangSource}/elimine`),
    {
      method: 'PUT',
      headers: authHeaders(token, false),
    },
  );
  return res.json() as Promise<FormatGraphe>;
}

export async function reinitialiserLien(
  editionId: number,
  groupeSourceId: number,
  rangSource: number,
  token: string,
): Promise<FormatGraphe> {
  const res = await fetchWithRetry(
    url(
      `/${editionId}/groupes/${groupeSourceId}/liens/${rangSource}/reinitialiser`,
    ),
    {
      method: 'PUT',
      headers: authHeaders(token, false),
    },
  );
  return res.json() as Promise<FormatGraphe>;
}

// ─── Phase ↔ Jour ─────────────────────────────────────────────────────────────

export async function associerPhaseJour(
  editionId: number,
  phaseId: number,
  editionJourId: number,
  token: string,
): Promise<FormatGraphe> {
  const res = await fetchWithRetry(
    url(`/${editionId}/phases/${phaseId}/jours`),
    {
      method: 'POST',
      headers: authHeaders(token, true),
      body: JSON.stringify({ editionJourId }),
    },
  );
  return res.json() as Promise<FormatGraphe>;
}

export async function dissocierPhaseJour(
  editionId: number,
  phaseId: number,
  editionJourId: number,
  token: string,
): Promise<void> {
  await fetchWithRetry(
    url(`/${editionId}/phases/${phaseId}/jours/${editionJourId}`),
    {
      method: 'DELETE',
      headers: authHeaders(token, false),
    },
  );
}

// ─── Preset ───────────────────────────────────────────────────────────────────

export type GenererPresetPayload = {
  preset: FormatPhaseFinale;
  nbPoules: number;
  nbEquipesParPoule: number;
  nbEquipesQualifieesParPoule: number;
  forcer?: boolean;
};

export async function genererPreset(
  editionId: number,
  payload: GenererPresetPayload,
  token: string,
): Promise<FormatGraphe> {
  const res = await fetchWithRetry(url(`/${editionId}/preset`), {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<FormatGraphe>;
}
