import { ServerError } from '../../api/errors';
import type { EquipeRef, ModificationEquipe } from '../../api/types/inscription.types';
import { MESSAGE_NOM_COURT_VERROUILLE, MESSAGE_NOM_SANS_EMOJI } from './equipeCreationErreur';

export type { ModificationEquipe };

/** Nom court non modifiable : au moins une candidature référence l'équipe. */
export function estNomCourtVerrouille(equipe: EquipeRef): boolean {
  return (equipe.nbCandidatures ?? 0) > 0;
}

/**
 * Corps de la requête de modification ; `null` si rien n'a changé. La clé `nom`
 * est absente si l'équipe est verrouillée ou si le nom court est inchangé ;
 * `nomComplet` vaut `null` quand le champ a été vidé. Aucune règle de nom n'est
 * appliquée ici : le back normalise et décide.
 */
export function construireModification(
  equipe: EquipeRef,
  saisieNom: string,
  saisieNomComplet: string,
): ModificationEquipe | null {
  const modification: ModificationEquipe = {};
  const nom = saisieNom.trim();
  if (!estNomCourtVerrouille(equipe) && nom !== equipe.nom) {
    modification.nom = nom;
  }
  const nomComplet = saisieNomComplet.trim();
  if (nomComplet !== (equipe.nomComplet ?? '')) {
    modification.nomComplet = nomComplet || null;
  }
  return Object.keys(modification).length > 0 ? modification : null;
}

/** Renommage refusé parce qu'une candidature référence l'équipe (et non pour un doublon). */
export function estRefusVerrouNomCourt(erreur: unknown): boolean {
  return (
    erreur instanceof ServerError &&
    erreur.status === 409 &&
    erreur.message.includes(MESSAGE_NOM_COURT_VERROUILLE)
  );
}

/**
 * Deux 409 de sens différents : verrou du nom court, ou nom déjà pris. Les
 * autres refus 400 ne sont pas affichés tels quels : ce sont des messages de
 * validation techniques.
 */
export function messageErreurModificationEquipe(erreur: unknown): string {
  if (estRefusVerrouNomCourt(erreur)) return MESSAGE_NOM_COURT_VERROUILLE;
  if (erreur instanceof ServerError) {
    if (erreur.status === 409) return 'Cette équipe existe déjà';
    if (erreur.status === 400 && erreur.message.includes(MESSAGE_NOM_SANS_EMOJI)) {
      return MESSAGE_NOM_SANS_EMOJI;
    }
    if (erreur.status === 404) return "Cette équipe n'existe plus.";
  }
  return "Erreur lors de l'enregistrement. Réessaie.";
}
