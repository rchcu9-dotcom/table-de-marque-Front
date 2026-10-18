import type { StatutInscription } from '../../api/types/inscription.types';

export const STATUT_CONFIG: Record<
  StatutInscription,
  { label: string; className: string }
> = {
  CANDIDATE:        { label: 'En attente',        className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  LISTE_ATTENTE:    { label: "Liste d'attente",   className: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  RESERVEE:         { label: 'Réservée',           className: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  PAIEMENT_ATTENDU: { label: 'Paiement attendu',  className: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  VALIDEE:          { label: 'Validée',            className: 'bg-green-500/20 text-green-300 border-green-500/40' },
  DOSSIER_EN_COURS: { label: 'Dossier en cours',  className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  DOSSIER_COMPLET:  { label: 'Dossier complet',   className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  REFUSEE:          { label: 'Refusée',            className: 'bg-red-500/20 text-red-300 border-red-500/40' },
};

/**
 * Ordre du parcours d'inscription (tri « Statut » et ordre des pastilles de
 * filtre) — pas l'ordre alphabétique. RESERVEE, absent du backlog, est placé
 * juste après la candidature : c'est une place réservée avant la demande de
 * paiement.
 */
export const ORDRE_PARCOURS_STATUT: readonly StatutInscription[] = [
  'CANDIDATE',
  'RESERVEE',
  'PAIEMENT_ATTENDU',
  'VALIDEE',
  'DOSSIER_EN_COURS',
  'DOSSIER_COMPLET',
  'LISTE_ATTENTE',
  'REFUSEE',
];

export function rangParcours(statut: StatutInscription): number {
  const i = ORDRE_PARCOURS_STATUT.indexOf(statut);
  return i === -1 ? ORDRE_PARCOURS_STATUT.length : i;
}

/** Statuts à partir desquels un dossier joueurs/coachs existe. */
export const STATUTS_AVEC_DOSSIER: readonly StatutInscription[] = [
  'VALIDEE',
  'DOSSIER_EN_COURS',
  'DOSSIER_COMPLET',
];
