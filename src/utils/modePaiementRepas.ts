import type { ModePaiementRepas } from '../api/types/inscription.types';

export const LIBELLES_MODE_PAIEMENT_REPAS: Record<ModePaiementRepas, string> = {
  VIREMENT: 'Virement',
  CHEQUE: 'Chèque',
  AUTRE: 'Autre',
};
