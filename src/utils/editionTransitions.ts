import type { EditionEtape } from '../api/types/inscription.types';

/**
 * Miroir de TRANSITIONS_ETAPE (back: src/inscription/domain/edition-transitions.ts).
 * Dupliqué faute de partage de constantes back/front ; un test compare les deux
 * tables pour qu'aucun bouton ne propose une transition refusée par le back.
 */
export const TRANSITIONS_ETAPE: Readonly<Record<EditionEtape, readonly EditionEtape[]>> = {
  CREEE: ['INSCRIPTIONS_OUVERTES'],
  CREATION_NOUVEAU_TOURNOI: ['INSCRIPTIONS_OUVERTES'],
  INSCRIPTIONS_OUVERTES: ['CLOTUREE', 'CREEE', 'CREATION_NOUVEAU_TOURNOI'],
  CLOTUREE: ['INSCRIPTIONS_OUVERTES', 'TOURNOI_DEMARRE'],
  TOURNOI_DEMARRE: [],
};

/** Étapes de la frise de pilotage (libellés affichés, jamais les codes back). */
export type EtapePilotage =
  | 'PREPARATION'
  | 'INSCRIPTIONS_OUVERTES'
  | 'CLOTUREE'
  | 'TOURNOI_DEMARRE'
  | 'SAISON_SUIVANTE';

export const ETAPES_PILOTAGE: readonly { cle: EtapePilotage; label: string; description: string }[] = [
  {
    cle: 'PREPARATION',
    label: 'Préparation',
    description: "L'édition se paramètre ; les équipes ne peuvent pas encore candidater.",
  },
  {
    cle: 'INSCRIPTIONS_OUVERTES',
    label: 'Inscriptions ouvertes',
    description: 'Les équipes peuvent déposer leur candidature.',
  },
  {
    cle: 'CLOTUREE',
    label: 'Inscriptions clôturées',
    description: 'Plus de nouvelle candidature ; les dossiers se complètent.',
  },
  {
    cle: 'TOURNOI_DEMARRE',
    label: 'Tournoi en cours',
    description: 'Les dossiers sont gelés, le tournoi se joue.',
  },
  {
    cle: 'SAISON_SUIVANTE',
    label: 'Saison suivante',
    description: 'La prochaine édition est en préparation.',
  },
];

export function etapePilotageDe(etape: EditionEtape): EtapePilotage {
  switch (etape) {
    case 'CREEE':
    case 'CREATION_NOUVEAU_TOURNOI':
      return 'PREPARATION';
    default:
      return etape;
  }
}

export function libelleEtape(etape: EditionEtape): string {
  const cle = etapePilotageDe(etape);
  return ETAPES_PILOTAGE.find((e) => e.cle === cle)!.label;
}

export type ActionEtape = 'ouvrir' | 'cloturer' | 'demarrer' | 'revenir';
export type Confirmation = 'aucune' | 'simple' | 'forte';

export type ActionPilotage = {
  action: ActionEtape;
  cible: EditionEtape;
  libelle: string;
  principale: boolean;
  confirmation: Confirmation;
};

function actionVers(from: EditionEtape, cible: EditionEtape): ActionPilotage | null {
  switch (cible) {
    case 'INSCRIPTIONS_OUVERTES':
      return from === 'CLOTUREE'
        ? { action: 'ouvrir', cible, libelle: 'Rouvrir les inscriptions', principale: false, confirmation: 'simple' }
        : { action: 'ouvrir', cible, libelle: 'Ouvrir les inscriptions', principale: true, confirmation: 'aucune' };
    case 'CLOTUREE':
      return { action: 'cloturer', cible, libelle: 'Clôturer les inscriptions', principale: true, confirmation: 'simple' };
    case 'CREEE':
    case 'CREATION_NOUVEAU_TOURNOI':
      // L'état exact restauré (CREEE ou CREATION_NOUVEAU_TOURNOI) est choisi par le back.
      return { action: 'revenir', cible, libelle: 'Revenir en préparation', principale: false, confirmation: 'simple' };
    case 'TOURNOI_DEMARRE':
      return { action: 'demarrer', cible, libelle: 'Lancer le tournoi', principale: true, confirmation: 'forte' };
    default:
      return null;
  }
}

/**
 * Actions possibles depuis l'étape courante : exactement les transitions
 * autorisées, dédoublonnées par action (les deux cibles de Préparation donnent
 * une seule action « Revenir en préparation »).
 */
export function actionsPourEtape(etape: EditionEtape): ActionPilotage[] {
  const actions = (TRANSITIONS_ETAPE[etape] ?? [])
    .map((cible) => actionVers(etape, cible))
    .filter((a): a is ActionPilotage => a !== null);
  return actions
    .filter((a, i) => actions.findIndex((b) => b.action === a.action) === i)
    .sort((a, b) => Number(b.principale) - Number(a.principale));
}

export type OutilAdmin = 'PARAMETRES_INSCRIPTION' | 'PARAMETRES_SPORTIFS' | 'SIMULATION_PLANNING' | 'PRESENTATION';

export function outilMisEnAvant(etape: EditionEtape): OutilAdmin {
  switch (etapePilotageDe(etape)) {
    case 'PREPARATION':
      return 'PARAMETRES_INSCRIPTION';
    case 'INSCRIPTIONS_OUVERTES':
      return 'PARAMETRES_SPORTIFS';
    case 'CLOTUREE':
      return 'SIMULATION_PLANNING';
    default:
      return 'PRESENTATION';
  }
}
