import { getApiBaseUrl } from './env';
import { fetchWithRetry } from './fetchWithRetry';
import type { Edition, EquipeRef, ProfilInscription } from './types/inscription.types';

function inscriptionUrl(path: string): string {
  return `${getApiBaseUrl()}/inscription${path}`;
}

export async function fetchEditionCourante(): Promise<Edition | null> {
  try {
    const res = await fetchWithRetry(inscriptionUrl('/edition/courante'));
    return res.json() as Promise<Edition>;
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 404) {
      return null;
    }
    throw e;
  }
}

export async function fetchEquipesReferentiel(): Promise<EquipeRef[]> {
  const res = await fetchWithRetry(inscriptionUrl('/equipes'));
  return res.json() as Promise<EquipeRef[]>;
}

export async function createEquipeDemande(
  data: { nom: string; logoUrl?: string },
  token: string,
): Promise<EquipeRef> {
  const res = await fetchWithRetry(inscriptionUrl('/equipes'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return res.json() as Promise<EquipeRef>;
}

export async function fetchProfilInscription(firebaseToken: string): Promise<ProfilInscription> {
  const res = await fetchWithRetry(inscriptionUrl('/auth/me'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firebaseToken }),
  });
  return res.json() as Promise<ProfilInscription>;
}
