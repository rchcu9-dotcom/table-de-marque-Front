import type { EditionEtape } from '../api/types/inscription.types';
import type { ActionInscriptions } from '../hooks/useChangerEtapeInscriptions';

export type ConfirmationSwitch = 'aucune' | 'reouverture' | 'fermeture' | null;

export type SwitchView = {
  checked: boolean;
  disabled: boolean;
  label: string;
  hint: string;
  action: ActionInscriptions | null;
  confirm: ConfirmationSwitch;
};

/** Seul endroit où l'`etape` est traduite en état du switch. */
export function viewFromEtape(etape: EditionEtape): SwitchView {
  switch (etape) {
    case 'INSCRIPTIONS_OUVERTES':
      return {
        checked: true,
        disabled: false,
        label: 'Inscriptions ouvertes',
        hint: 'Les équipes peuvent déposer leur candidature.',
        action: 'cloturer',
        confirm: 'fermeture',
      };
    case 'CLOTUREE':
      return {
        checked: false,
        disabled: false,
        label: 'Inscriptions fermées',
        hint: 'Les inscriptions sont clôturées.',
        action: 'ouvrir',
        confirm: 'reouverture',
      };
    case 'TOURNOI_DEMARRE':
      return {
        checked: false,
        disabled: true,
        label: 'Inscriptions fermées',
        hint: 'Le tournoi a démarré, les inscriptions ne peuvent plus être rouvertes',
        action: null,
        confirm: null,
      };
    case 'CREEE':
    case 'CREATION_NOUVEAU_TOURNOI':
    default:
      return {
        checked: false,
        disabled: false,
        label: 'Inscriptions fermées',
        hint: 'Les inscriptions ne sont pas encore ouvertes.',
        action: 'ouvrir',
        confirm: 'aucune',
      };
  }
}
