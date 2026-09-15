import { getApiBaseUrl } from './env';
import { fetchWithRetry } from './fetchWithRetry';

function url(path: string): string {
  return `${getApiBaseUrl()}/parametres-sportifs${path}`;
}

export type FormatPhaseFinale =
  | 'ELIMINATION_DIRECTE'
  | 'POULES_FINALES'
  | 'CLASSEMENT_CROISE';

export type MatriceDelaiMinActivite = Record<string, Record<string, number>>;

export type ParametresSportifs = {
  editionId: number;
  dureeSurfacageMin: number;
  dureeMatchPouleMin: number;
  dureeMatchFinalMin: number;
  dureeInterMatchMin: number | null;
  delaiMinActivite: MatriceDelaiMinActivite | null;
  nbPatinoires: number | null;
  nbPoules: number | null;
  nbEquipesParPoule: number | null;
  nbEquipesQualifieesParPoule: number | null;
  formatPhaseFinale: FormatPhaseFinale | null;
  reglesTieBreak: string[] | null;
  nbPlacesMax: number;
};

export type UpdateParametresSportifsPayload = Partial<
  Omit<ParametresSportifs, 'editionId' | 'nbPlacesMax'>
>;

export type TypeJournee = '5V5' | '3V3' | 'MIXTE';

export type EditionJour = {
  id: number;
  editionId: number;
  numeroJour: number;
  date: string;
  heureDebut: string;
  heureFin: string;
  typeJournee: TypeJournee;
};

export type UpsertJourPayload = {
  numeroJour: number;
  date: string;
  heureDebut: string;
  heureFin: string;
  typeJournee: TypeJournee;
};

function authHeaders(token: string, hasBody: boolean): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
  };
}

export async function fetchParametresSportifs(
  editionId: number,
  token: string,
): Promise<ParametresSportifs> {
  const res = await fetchWithRetry(url(`/${editionId}`), {
    headers: authHeaders(token, false),
  });
  return res.json() as Promise<ParametresSportifs>;
}

export async function updateParametresSportifs(
  editionId: number,
  payload: UpdateParametresSportifsPayload,
  token: string,
): Promise<ParametresSportifs> {
  const res = await fetchWithRetry(url(`/${editionId}`), {
    method: 'PUT',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<ParametresSportifs>;
}

export async function fetchEditionJours(
  editionId: number,
  token: string,
): Promise<EditionJour[]> {
  const res = await fetchWithRetry(url(`/${editionId}/jours`), {
    headers: authHeaders(token, false),
  });
  return res.json() as Promise<EditionJour[]>;
}

export async function upsertEditionJour(
  editionId: number,
  payload: UpsertJourPayload,
  token: string,
): Promise<EditionJour> {
  const res = await fetchWithRetry(url(`/${editionId}/jours`), {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<EditionJour>;
}

export async function deleteEditionJour(
  editionId: number,
  numeroJour: number,
  token: string,
): Promise<void> {
  await fetchWithRetry(url(`/${editionId}/jours/${numeroJour}`), {
    method: 'DELETE',
    headers: authHeaders(token, false),
  });
}

export type ActiviteCatalogue = {
  id: number;
  editionId: number;
  label: string;
  dureeParEquipeMin: number;
  capaciteParallele: number;
};

export type UpsertActiviteCataloguePayload = {
  label: string;
  dureeParEquipeMin: number;
  capaciteParallele: number;
};

export type CreneauActiviteStatut = 'LIBRE' | 'CONFIRME';

export type CreneauActivite = {
  id: number;
  editionId: number;
  activiteId: number;
  date: string;
  heureDebut: string;
  dureeMin: number;
  equipeId: number | null;
  equipeLabel: string | null;
  statut: CreneauActiviteStatut;
};

export type UpsertCreneauActivitePayload = {
  activiteId: number;
  date: string;
  heureDebut: string;
  dureeMin: number;
};

export async function fetchActivitesCatalogue(
  editionId: number,
  token: string,
): Promise<ActiviteCatalogue[]> {
  const res = await fetchWithRetry(url(`/${editionId}/activites-catalogue`), {
    headers: authHeaders(token, false),
  });
  return res.json() as Promise<ActiviteCatalogue[]>;
}

export async function createActiviteCatalogue(
  editionId: number,
  payload: UpsertActiviteCataloguePayload,
  token: string,
): Promise<ActiviteCatalogue> {
  const res = await fetchWithRetry(url(`/${editionId}/activites-catalogue`), {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<ActiviteCatalogue>;
}

export async function updateActiviteCatalogue(
  editionId: number,
  id: number,
  payload: UpsertActiviteCataloguePayload,
  token: string,
): Promise<ActiviteCatalogue> {
  const res = await fetchWithRetry(url(`/${editionId}/activites-catalogue/${id}`), {
    method: 'PUT',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<ActiviteCatalogue>;
}

export async function deleteActiviteCatalogue(
  editionId: number,
  id: number,
  token: string,
): Promise<void> {
  await fetchWithRetry(url(`/${editionId}/activites-catalogue/${id}`), {
    method: 'DELETE',
    headers: authHeaders(token, false),
  });
}

export async function fetchCreneauxActivite(
  editionId: number,
  token: string,
): Promise<CreneauActivite[]> {
  const res = await fetchWithRetry(url(`/${editionId}/creneaux-activite`), {
    headers: authHeaders(token, false),
  });
  return res.json() as Promise<CreneauActivite[]>;
}

export async function createCreneauActivite(
  editionId: number,
  payload: UpsertCreneauActivitePayload,
  token: string,
): Promise<CreneauActivite> {
  const res = await fetchWithRetry(url(`/${editionId}/creneaux-activite`), {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<CreneauActivite>;
}

export async function updateCreneauActivite(
  editionId: number,
  id: number,
  payload: UpsertCreneauActivitePayload,
  token: string,
): Promise<CreneauActivite> {
  const res = await fetchWithRetry(url(`/${editionId}/creneaux-activite/${id}`), {
    method: 'PUT',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<CreneauActivite>;
}

export async function deleteCreneauActivite(
  editionId: number,
  id: number,
  token: string,
): Promise<void> {
  await fetchWithRetry(url(`/${editionId}/creneaux-activite/${id}`), {
    method: 'DELETE',
    headers: authHeaders(token, false),
  });
}
