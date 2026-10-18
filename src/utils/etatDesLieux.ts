import type { CandidatureOrganisateur, Edition, StatutInscription } from '../api/types/inscription.types';
import type { ParametresSportifs } from '../api/parametresSportifs';

const STATUTS_RETENUS: StatutInscription[] = ['VALIDEE', 'DOSSIER_EN_COURS', 'DOSSIER_COMPLET'];

export type EtatCandidatures = {
  /** Toutes candidatures, REFUSEE comprises : critère du retour en Préparation côté back. */
  total: number;
  candidatures: number;
  retenues: number;
  paiementsAttendus: number;
  dossiersComplets: number;
  dossiersIncomplets: string[];
};

/** Comptages informatifs du bloc « Pilotage du tournoi » (jamais bloquants). */
export function etatCandidatures(candidatures: CandidatureOrganisateur[]): EtatCandidatures {
  const retenues = candidatures.filter((c) => STATUTS_RETENUS.includes(c.statut));
  return {
    total: candidatures.length,
    candidatures: candidatures.filter((c) => c.statut !== 'REFUSEE').length,
    retenues: retenues.length,
    paiementsAttendus: candidatures.filter((c) => c.statut === 'PAIEMENT_ATTENDU').length,
    dossiersComplets: retenues.filter((c) => c.statut === 'DOSSIER_COMPLET').length,
    dossiersIncomplets: retenues
      .filter((c) => c.statut !== 'DOSSIER_COMPLET')
      .map((c) => c.equipeNom),
  };
}

export function parametresInscriptionRemplis(edition: Edition): boolean {
  return (
    !!edition.nom?.trim() &&
    !!edition.categorie?.trim() &&
    !!edition.dateDebut &&
    edition.nbPlacesMax > 0 &&
    edition.anneesAge.length > 0
  );
}

export function parametresSportifsRemplis(parametres: ParametresSportifs): boolean {
  return (
    parametres.nbPatinoires != null &&
    parametres.nbPoules != null &&
    parametres.nbEquipesParPoule != null
  );
}
