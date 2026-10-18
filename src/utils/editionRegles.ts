import type { EditionEtape } from '../api/types/inscription.types';

/**
 * Miroir de back/src/inscription/domain/edition-regles.ts (un test compare les
 * deux fichiers). Paramètres d'inscription figés dès l'ouverture des
 * inscriptions ; formule sportive ajustable jusqu'au lancement du tournoi.
 */
export const ETAPES_PARAMETRES_INSCRIPTION_MODIFIABLES: readonly EditionEtape[] = ['CREEE', 'CREATION_NOUVEAU_TOURNOI'];
export const ETAPES_FORMULE_SPORTIVE_MODIFIABLE: readonly EditionEtape[] = ['CREEE', 'CREATION_NOUVEAU_TOURNOI', 'INSCRIPTIONS_OUVERTES', 'CLOTUREE'];

export function parametresInscriptionModifiables(etape: EditionEtape): boolean {
  return ETAPES_PARAMETRES_INSCRIPTION_MODIFIABLES.includes(etape);
}

export function formuleSportiveModifiable(etape: EditionEtape): boolean {
  return ETAPES_FORMULE_SPORTIVE_MODIFIABLE.includes(etape);
}

export const MESSAGE_INSCRIPTION_FIGEE =
  "Les paramètres d'inscription ne sont plus modifiables une fois les inscriptions ouvertes. Revenez en Préparation depuis l'accueil admin pour les changer.";
export const MESSAGE_FORMULE_FIGEE =
  "La formule sportive n'est plus modifiable une fois le tournoi lancé.";
export const MESSAGE_RETOUR_AVEC_CANDIDATURES =
  'Des équipes ont déjà candidaté sur ces paramètres : ils ne peuvent plus être modifiés.';
