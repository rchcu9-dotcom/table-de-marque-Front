import { ServerError } from '../../api/errors';

/** Même valeur que le back (`NOM_COURT_MAX`). */
export const NOM_COURT_MAX = 100;

/** Même libellé que le back (`MESSAGE_NOM_COURT_VERROUILLE`). */
export const MESSAGE_NOM_COURT_VERROUILLE =
  'Le nom court ne peut plus être modifié : une candidature fait référence à cette équipe';

/** Même valeur que le back (`NOM_COMPLET_MAX`). */
export const NOM_COMPLET_MAX = 150;

/** Même libellé que le back (`MESSAGE_NOM_SANS_EMOJI`). */
export const MESSAGE_NOM_SANS_EMOJI = "Le nom ne doit pas contenir d'emoji";

/**
 * 409 (nom déjà pris) → « Cette équipe existe déjà » ; 400 pour un emoji → le
 * motif ; sinon le message générique. Les autres refus 400 ne sont pas
 * affichés tels quels : ce sont des messages de validation techniques.
 */
export function messageErreurCreationEquipe(erreur: unknown): string {
  if (erreur instanceof ServerError) {
    if (erreur.status === 409) return 'Cette équipe existe déjà';
    if (erreur.status === 400 && erreur.message.includes(MESSAGE_NOM_SANS_EMOJI)) {
      return MESSAGE_NOM_SANS_EMOJI;
    }
  }
  return 'Erreur lors de la création. Réessaie.';
}
