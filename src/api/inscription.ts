import { getApiBaseUrl } from './env';
import { fetchWithRetry } from './fetchWithRetry';
import type { PosteJoueur } from '../utils/posteJoueur';
import type {
  Edition,
  EquipeRef,
  ProfilInscription,
  MaCandidature,
  CandidatureOrganisateur,
  ModePaiementRepas,
  DossierComplet,
  JoueurDossier,
  CoachDossier,
  Dossier,
} from './types/inscription.types';

function inscriptionUrl(path: string): string {
  return `${getApiBaseUrl()}/inscription${path}`;
}

export async function demarrerTournoi(
  editionId: number,
  token: string,
): Promise<Edition> {
  const res = await fetchWithRetry(
    inscriptionUrl(`/editions/${editionId}/demarrer-tournoi`),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return res.json() as Promise<Edition>;
}

/**
 * Sous-ensemble de UpdateEditionDto (back) géré depuis le front. Exclut
 * volontairement dureeSurfacageMin/dureeMatchPouleMin/dureeMatchFinalMin,
 * propriété exclusive de ParametresSportifsPage (PUT /parametres-sportifs/:id)
 * pour ne pas donner deux chemins d'écriture au même champ.
 */
export type UpdateEditionPayload = Partial<{
  nom: string;
  categorie: string;
  annee: number;
  dateDebut: string;
  dateFinDebut: string;
  fraisInscription: number;
  prixRepas: number;
  nbPlacesMax: number;
  imageUrl: string | null;
  imageDossierUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  msgBienvenue: string | null;
  msgFaisonsConnaissance: string | null;
  msgSelectionEquipe: string | null;
  msgAjoutEquipe: string | null;
  msgInscriptionEnCours: string | null;
  msgInscriptionValidee: string | null;
  msgLancerDemande: string | null;
  msgDemandeSoumise: string | null;
  msgEquipeRefusee: string | null;
  msgListeAttente: string | null;
  msgPaiementAttendu: string | null;
  msgChequeInfo1: string | null;
  msgChequeInfo2: string | null;
  msgInscriptionConfirmee: string | null;
  msgRenseigneJoueurs: string | null;
}>;

export async function updateEdition(
  editionId: number,
  payload: UpdateEditionPayload,
  token: string,
): Promise<Edition> {
  const res = await fetchWithRetry(inscriptionUrl(`/editions/${editionId}`), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<Edition>;
}

/**
 * Switch « Inscriptions ouvertes / fermées » : transitions d'étape dédiées
 * (409 si la transition n'est pas autorisée). Le PATCH générique n'accepte
 * plus `etape` ; TOURNOI_DEMARRE reste réservé à demarrerTournoi().
 */
export async function ouvrirInscriptions(
  editionId: number,
  token: string,
): Promise<Edition> {
  const res = await fetchWithRetry(
    inscriptionUrl(`/editions/${editionId}/ouvrir-inscriptions`),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return res.json() as Promise<Edition>;
}

export async function cloturerInscriptions(
  editionId: number,
  token: string,
): Promise<Edition> {
  const res = await fetchWithRetry(
    inscriptionUrl(`/editions/${editionId}/cloturer-inscriptions`),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return res.json() as Promise<Edition>;
}

// ── Image RIB (upload binaire, remplace le champ URL collée) ───────────────

export async function uploadImageRib(
  editionId: number,
  file: File,
  token: string,
): Promise<Edition> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetchWithRetry(
    inscriptionUrl(`/editions/${editionId}/image-rib`),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );
  return res.json() as Promise<Edition>;
}

export async function deleteImageRib(
  editionId: number,
  token: string,
): Promise<Edition> {
  const res = await fetchWithRetry(
    inscriptionUrl(`/editions/${editionId}/image-rib`),
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return res.json() as Promise<Edition>;
}

/**
 * URL de récupération du binaire RIB, avec cache-busting basé sur
 * imageRibUpdatedAt (évite qu'un navigateur affiche une image RIB périmée
 * après un nouvel upload sur la même édition).
 */
export function buildImageRibSrc(
  editionId: number,
  imageRibUpdatedAt?: string,
): string {
  return inscriptionUrl(
    `/editions/${editionId}/image-rib?v=${encodeURIComponent(imageRibUpdatedAt ?? '')}`,
  );
}

// ── Années d'âge (paramètres d'inscription) ─────────────────────────────────

export async function ajouterAnneeAge(
  editionId: number,
  annee: number,
  token: string,
): Promise<Edition> {
  const res = await fetchWithRetry(
    inscriptionUrl(`/editions/${editionId}/annees-age`),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ annee }),
    },
  );
  return res.json() as Promise<Edition>;
}

export async function retirerAnneeAge(
  editionId: number,
  annee: number,
  token: string,
): Promise<Edition> {
  const res = await fetchWithRetry(
    inscriptionUrl(`/editions/${editionId}/annees-age/${annee}`),
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return res.json() as Promise<Edition>;
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

// ── Cycle annuel de l'édition ───────────────────────────────────────────────

export async function fetchEditionEnPreparation(token: string): Promise<Edition | null> {
  try {
    const res = await fetchWithRetry(inscriptionUrl('/edition/en-preparation'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json() as Promise<Edition | null>;
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 404) {
      return null;
    }
    throw e;
  }
}

export type CreateEditionPreparationPayload = {
  nom: string;
  categorie: string;
  annee: number;
};

export async function createEditionEnPreparation(
  payload: CreateEditionPreparationPayload,
  token: string,
): Promise<Edition> {
  const res = await fetchWithRetry(inscriptionUrl('/editions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...payload, etape: 'CREATION_NOUVEAU_TOURNOI' }),
  });
  return res.json() as Promise<Edition>;
}

/**
 * Déclenche le dump bloquant des tables TA_* (spec cycle annuel §4).
 * Retourne le blob + le nom de fichier (extrait du header
 * Content-Disposition) pour que l'appelant déclenche le téléchargement
 * navigateur — fetch ne peut pas suivre un header Authorization via un
 * simple <a href>, d'où ce détour par blob + URL objet.
 */
export async function exportTaDump(
  editionId: number,
  token: string,
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetchWithRetry(inscriptionUrl(`/editions/${editionId}/export-ta`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match?.[1] ?? `dump-ta-${editionId}.json`;
  return { blob, filename };
}

export async function fetchEquipesReferentiel(): Promise<EquipeRef[]> {
  const res = await fetchWithRetry(inscriptionUrl('/equipes'));
  return res.json() as Promise<EquipeRef[]>;
}

// ── Organisateur : équipes du référentiel en attente de validation ─────────
// Les équipes ajoutées via "Ton équipe n'est pas présente ? Ajoute la !" sont
// créées inactives (active: false) et invisibles de /equipes (liste publique
// filtrée sur active=true) tant qu'un organisateur ne les a pas activées.

export async function fetchEquipesReferentielToutes(token: string): Promise<EquipeRef[]> {
  const res = await fetchWithRetry(inscriptionUrl('/equipes/toutes'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<EquipeRef[]>;
}

export async function activerEquipeReferentiel(id: number, token: string): Promise<EquipeRef> {
  const res = await fetchWithRetry(inscriptionUrl(`/equipes/${id}/activer`), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<EquipeRef>;
}

export async function desactiverEquipeReferentiel(id: number, token: string): Promise<EquipeRef> {
  const res = await fetchWithRetry(inscriptionUrl(`/equipes/${id}/desactiver`), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<EquipeRef>;
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

export async function fetchProfilInscription(token: string): Promise<ProfilInscription> {
  const res = await fetchWithRetry(inscriptionUrl('/auth/me'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<ProfilInscription>;
}

export async function updatePseudo(pseudo: string, token: string): Promise<ProfilInscription> {
  const res = await fetchWithRetry(inscriptionUrl('/auth/pseudo'), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pseudo }),
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

export type StatutTriageCible = 'PAIEMENT_ATTENDU' | 'LISTE_ATTENTE' | 'REFUSEE';

export async function changerStatutTriage(
  id: number,
  statut: StatutTriageCible,
  token: string,
): Promise<{ id: number; statut: string }> {
  const res = await fetchWithRetry(inscriptionUrl(`/candidatures/${id}/statut-triage`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ statut }),
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

/** `{ paye: false }` annule le paiement ; `paye: true` exige la date (AAAA-MM-JJ) et le mode. */
export type PaiementRepasPayload =
  | { paye: false }
  | { paye: true; datePaiement: string; mode: ModePaiementRepas };

export type PaiementRepasResult = {
  id: number;
  equipeNom: string;
  repasPaiementRecu: boolean;
  dateReceptionRepas: string | null;
  datePaiementRepas: string | null;
  repasModePaiement: ModePaiementRepas | null;
};

export async function marquerPaiementRepas(
  id: number,
  payload: PaiementRepasPayload,
  token: string,
): Promise<PaiementRepasResult> {
  const res = await fetchWithRetry(inscriptionUrl(`/candidatures/${id}/repas-paiement`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<PaiementRepasResult>;
}

export async function definirCommentaireOrganisateur(
  id: number,
  commentaire: string,
  token: string,
): Promise<{ id: number; commentaireOrganisateur: string | null }> {
  const res = await fetchWithRetry(inscriptionUrl(`/candidatures/${id}/commentaire-organisateur`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ commentaire }),
  });
  return res.json() as Promise<{ id: number; commentaireOrganisateur: string | null }>;
}

export async function validerDossier(
  id: number,
  token: string,
): Promise<{ id: number; statut: string }> {
  const res = await fetchWithRetry(inscriptionUrl(`/candidatures/${id}/valider-dossier`), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<{ id: number; statut: string }>;
}

export async function rouvrirDossier(
  id: number,
  token: string,
): Promise<{ id: number; statut: string }> {
  const res = await fetchWithRetry(inscriptionUrl(`/candidatures/${id}/rouvrir-dossier`), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<{ id: number; statut: string }>;
}

// ── Dossier joueurs/coachs ───────────────────────────────────────────────────

export async function fetchMonDossier(token: string): Promise<DossierComplet> {
  const res = await fetchWithRetry(inscriptionUrl('/dossier/moi'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<DossierComplet>;
}

export async function fetchDossierParCandidature(
  candidatureId: number,
  token: string,
): Promise<DossierComplet> {
  const res = await fetchWithRetry(inscriptionUrl(`/dossier/candidature/${candidatureId}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<DossierComplet>;
}

export type JoueurDossierInput = {
  nom: string;
  prenom: string;
  numero: number;
  poste: PosteJoueur;
  licenceFFH?: string | null;
  anneeNaissance: number;
  particularitesAlim?: string | null;
};

export async function ajouterJoueur(
  data: JoueurDossierInput,
  token: string,
): Promise<JoueurDossier> {
  const res = await fetchWithRetry(inscriptionUrl('/dossier/joueurs'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return res.json() as Promise<JoueurDossier>;
}

export async function modifierJoueur(
  id: number,
  data: Partial<JoueurDossierInput>,
  token: string,
): Promise<JoueurDossier> {
  const res = await fetchWithRetry(inscriptionUrl(`/dossier/joueurs/${id}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return res.json() as Promise<JoueurDossier>;
}

export async function supprimerJoueur(id: number, token: string): Promise<void> {
  await fetchWithRetry(inscriptionUrl(`/dossier/joueurs/${id}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export type CoachDossierInput = {
  nom: string;
  prenom: string;
  presenceRepas?: boolean;
};

export async function ajouterCoach(
  data: CoachDossierInput,
  token: string,
): Promise<CoachDossier> {
  const res = await fetchWithRetry(inscriptionUrl('/dossier/coachs'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return res.json() as Promise<CoachDossier>;
}

export async function modifierCoach(
  id: number,
  data: Partial<CoachDossierInput>,
  token: string,
): Promise<CoachDossier> {
  const res = await fetchWithRetry(inscriptionUrl(`/dossier/coachs/${id}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return res.json() as Promise<CoachDossier>;
}

export async function supprimerCoach(id: number, token: string): Promise<void> {
  await fetchWithRetry(inscriptionUrl(`/dossier/coachs/${id}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function accepterDroitsImage(
  accepte: boolean,
  token: string,
): Promise<Dossier> {
  const res = await fetchWithRetry(inscriptionUrl('/dossier/droits-image'), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ accepte }),
  });
  return res.json() as Promise<Dossier>;
}
