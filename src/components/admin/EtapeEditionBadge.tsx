import type { EditionEtape } from '../../api/types/inscription.types';
import { etapePilotageDe, libelleEtape } from '../../utils/editionTransitions';

const COULEURS: Record<ReturnType<typeof etapePilotageDe>, string> = {
  PREPARATION: 'bg-slate-700 text-slate-200',
  INSCRIPTIONS_OUVERTES: 'bg-emerald-500 text-slate-950',
  CLOTUREE: 'bg-amber-500 text-slate-950',
  TOURNOI_DEMARRE: 'bg-sky-500 text-slate-950',
  SAISON_SUIVANTE: 'bg-slate-700 text-slate-200',
};

/** État de l'édition en lecture seule (libellé français, jamais le code back). */
export default function EtapeEditionBadge({ etape }: { etape: EditionEtape }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${COULEURS[etapePilotageDe(etape)]}`}
    >
      {libelleEtape(etape)}
    </span>
  );
}
