import { getApiBaseUrl } from './env';
import { fetchWithRetry } from './fetchWithRetry';
import type {
  Edition,
  EquipeRef,
  ProfilInscription,
  MaCandidature,
  CandidatureOrganisateur,
} from './types/inscription.types';

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

// ── US-002 : Responsable ────────────────────────────────────────────────────

export async function fetchMaCandidature(token: string): Promise<MaCandidature> {
  try {
    const res = await fetchWithRetry(inscriptionUrl('/candidatures/ma-candidature'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json() as Promise<MaCandidature>;
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 404) {
      return null;
    }
    throw e;
  }
}

export async function soumettreCanditature(
  equipeRefId: number,
  token: string,
): Promise<{ id: number; equipeNom: string; statut: string; createdAt: string }> {
  const res = await fetchWithRetry(inscriptionUrl('/candidatures'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ equipeRefId }),
  });
  return res.json() as Promise<{ id: number; equipeNom: string; statut: string; createdAt: string }>;
}

// ── US-003 : Organisateur ───────────────────────────────────────────────────

export async function fetchToutesCandidatures(token: string): Promise<CandidatureOrganisateur[]> {
  const res = await fetchWithRetry(inscriptionUrl('/candidatures'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<CandidatureOrganisateur[]>;
}

export async function accepterCandidature(
  id: number,
  token: string,
): Promise<{ id: number; statut: string }> {
  const res = await fetchWithRetry(inscriptionUrl(`/candidatures/${id}/accepter`), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<{ id: number; statut: string }>;
}

export async function promouvoCandidature(
  id: number,
  token: string,
): Promise<{ id: number; statut: string }> {
  const res = await fetchWithRetry(inscriptionUrl(`/candidatures/${id}/promouvoir`), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<{ id: number; statut: string }>;
}

export async function mettreListeAttente(
  id: number,
  token: string,
): Promise<{ id: number; statut: string }> {
  const res = await fetchWithRetry(inscriptionUrl(`/candidatures/${id}/liste-attente`), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<{ id: number; statut: string }>;
}

export async function refuserCandidature(
  id: number,
  token: string,
): Promise<{ id: number; statut: string }> {
  const res = await fetchWithRetry(inscriptionUrl(`/candidatures/${id}/refuser`), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<{ id: number; statut: string }>;
}

// ── US-004 : Validation paiement ────────────────────────────────────────────

export async function validerPaiement(
  id: number,
  dateVirement: string,
  token: string,
): Promise<{ id: number; equipeNom: string; statut: string; dateVirementInscription: string }> {
  const res = await fetchWithRetry(inscriptionUrl(`/candidatures/${id}/valider-paiement`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ dateVirement }),
  });
  return res.json() as Promise<{ id: number; equipeNom: string; statut: string; dateVirementInscription: string }>;
}
