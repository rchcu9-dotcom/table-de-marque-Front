import type { StatutInscription } from '../../api/types/inscription.types';
import { STATUT_CONFIG } from './statutConfig';

export function StatutBadge({ statut }: { statut: StatutInscription }) {
  const config = STATUT_CONFIG[statut] ?? { label: statut, className: 'bg-slate-700 text-slate-300 border-slate-600' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
