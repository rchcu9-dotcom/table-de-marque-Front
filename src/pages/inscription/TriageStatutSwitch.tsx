import type { CandidatureOrganisateur } from '../../api/types/inscription.types';
import type { StatutTriageCible } from '../../api/inscription';

interface TriageStatutSwitchProps {
  candidature: CandidatureOrganisateur;
  peutAccepter: boolean;
  onChangerStatut: (candidatureId: number, statut: StatutTriageCible) => void;
}

interface SegmentConfig {
  statut: StatutTriageCible;
  label: string;
  classesPleines: string;
  classesPales: string;
}

const SEGMENTS: SegmentConfig[] = [
  {
    statut: 'PAIEMENT_ATTENDU',
    label: 'Accepté',
    classesPleines: 'bg-green-600 text-white hover:bg-green-500',
    classesPales: 'bg-green-500/20 text-green-300 border border-green-500/40 hover:bg-green-500/30',
  },
  {
    statut: 'LISTE_ATTENTE',
    label: "Liste d'attente",
    classesPleines: 'bg-orange-500 text-white hover:bg-orange-400',
    classesPales: 'bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30',
  },
  {
    statut: 'REFUSEE',
    label: 'Refusé',
    classesPleines: 'bg-red-600 text-white hover:bg-red-500',
    classesPales: 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30',
  },
];

const LABELS_PAR_STATUT: Record<string, string> = {
  CANDIDATE: 'En attente',
  PAIEMENT_ATTENDU: 'Accepté',
  LISTE_ATTENTE: "Liste d'attente",
  REFUSEE: 'Refusé',
};

export function TriageStatutSwitch({
  candidature,
  peutAccepter,
  onChangerStatut,
}: TriageStatutSwitchProps) {
  const statutActuel = candidature.statut;
  const decisionDejaPrise = statutActuel !== 'CANDIDATE';

  function handleClick(segment: SegmentConfig) {
    if (segment.statut === statutActuel) return;
    if (segment.statut === 'PAIEMENT_ATTENDU' && !peutAccepter) return;

    if (decisionDejaPrise) {
      const confirme = window.confirm(
        `Faire passer ${candidature.equipeNom} de ${LABELS_PAR_STATUT[statutActuel]} à ${segment.label} ?`,
      );
      if (!confirme) return;
    }

    onChangerStatut(candidature.id, segment.statut);
  }

  return (
    <div className="flex gap-2 mt-3 flex-wrap items-center">
      {SEGMENTS.map((segment) => {
        const estActif = decisionDejaPrise && segment.statut === statutActuel;
        const estGrand = !decisionDejaPrise || estActif;
        const desactive = segment.statut === 'PAIEMENT_ATTENDU' && !peutAccepter && !estActif;

        return (
          <button
            key={segment.statut}
            type="button"
            onClick={() => handleClick(segment)}
            disabled={desactive}
            title={desactive ? 'Capacité maximale atteinte' : undefined}
            className={`rounded font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
              estGrand
                ? `px-3 py-1.5 text-xs ${segment.classesPleines}`
                : `px-2 py-1 text-[11px] opacity-70 ${segment.classesPales}`
            }`}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
