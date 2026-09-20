import type {
  CandidatureOrganisateur,
  DetailPaiementRepas,
  Edition,
  PaiementInscription,
} from '../../api/types/inscription.types';
import { formatFraisInscription } from '../../utils/msgPaiementAttendu';
import { LIBELLES_MODE_PAIEMENT_REPAS } from '../../utils/modePaiementRepas';

const NB_JOURS_REPAS = 2;

function libelleDetailPaiementRepas(detail: Partial<DetailPaiementRepas>): string | null {
  const parts: string[] = [];
  if (detail.repasDatePaiement) {
    parts.push(`le ${new Date(detail.repasDatePaiement).toLocaleDateString('fr-FR')}`);
  }
  if (detail.repasModePaiement) {
    parts.push(`par ${LIBELLES_MODE_PAIEMENT_REPAS[detail.repasModePaiement].toLowerCase()}`);
  }
  return parts.length > 0 ? `Payé ${parts.join(' ')}` : null;
}

function montantRepas(nbJoueurs: number, prixRepas: number): number {
  return nbJoueurs * prixRepas * NB_JOURS_REPAS;
}

function PaiementBadge({ paye }: { paye: boolean }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${
        paye
          ? 'bg-green-500/20 text-green-300 border-green-500/40'
          : 'bg-orange-500/20 text-orange-300 border-orange-500/40'
      }`}
    >
      {paye ? 'Payé' : 'Non payé'}
    </span>
  );
}

interface RecapitulatifPaiementCarteProps {
  candidature: PaiementInscription & Partial<DetailPaiementRepas> & { id: number };
  edition: Edition | null;
  /** Absent = lecture seule (vue responsable d'équipe). */
  onTogglePaiementRepas?: (candidatureId: number, paye: boolean) => void;
}

export function RecapitulatifPaiementCarte({
  candidature,
  edition,
  onTogglePaiementRepas,
}: RecapitulatifPaiementCarteProps) {
  if (!edition) return null;

  const total = montantRepas(candidature.nbJoueurs, edition.prixRepas);
  const detailRepas = candidature.repasPaiementRecu
    ? libelleDetailPaiementRepas(candidature)
    : null;

  return (
    <div className="mt-3 border-t border-slate-700 pt-3 space-y-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
        Récapitulatif paiement
      </p>

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-slate-300">
          Frais d'inscription — {formatFraisInscription(edition.fraisInscription)}
        </span>
        <PaiementBadge paye={candidature.fraisInscriptionPaye} />
      </div>

      <div className="flex items-center justify-between gap-2 text-sm flex-wrap">
        <span className="text-slate-300">
          Repas — {candidature.nbJoueurs} joueur(s) × {formatFraisInscription(edition.prixRepas)} ×{' '}
          {NB_JOURS_REPAS} jours = {formatFraisInscription(total)}
        </span>
        <div className="flex items-center gap-2">
          <PaiementBadge paye={candidature.repasPaiementRecu} />
          {onTogglePaiementRepas && (
            <button
              onClick={() =>
                onTogglePaiementRepas(candidature.id, !candidature.repasPaiementRecu)
              }
              className="px-2 py-1 rounded bg-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-600 transition"
            >
              {candidature.repasPaiementRecu
                ? 'Marquer comme non payé'
                : 'Marquer le repas comme payé'}
            </button>
          )}
        </div>
      </div>

      {detailRepas && <p className="text-xs text-slate-400">{detailRepas}</p>}

      {!onTogglePaiementRepas && (
        <p className="text-xs text-slate-400">
          Le statut de paiement est mis à jour par l'organisateur à réception de votre règlement.
        </p>
      )}
    </div>
  );
}

interface TotauxPaiementGlobauxProps {
  candidatures: CandidatureOrganisateur[];
  edition: Edition | null;
}

export function TotauxPaiementGlobaux({
  candidatures,
  edition,
}: TotauxPaiementGlobauxProps) {
  if (!edition) return null;

  const nbFraisPayes = candidatures.filter((c) => c.fraisInscriptionPaye).length;
  const totalFraisPaye = nbFraisPayes * edition.fraisInscription;
  const totalFraisAttendu = candidatures.length * edition.fraisInscription;

  let nbRepasPayes = 0;
  let totalRepasPaye = 0;
  let totalRepasAttendu = 0;
  for (const c of candidatures) {
    const montant = montantRepas(c.nbJoueurs, edition.prixRepas);
    totalRepasAttendu += montant;
    if (c.repasPaiementRecu) {
      nbRepasPayes += 1;
      totalRepasPaye += montant;
    }
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2 text-sm">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
        Totaux paiements
      </p>
      <p className="text-slate-300">
        Frais d'inscription : {nbFraisPayes} payés / {formatFraisInscription(totalFraisPaye)}{' '}
        sur {formatFraisInscription(totalFraisAttendu)} attendus
      </p>
      <p className="text-slate-300">
        Repas : {nbRepasPayes} payés / {formatFraisInscription(totalRepasPaye)} sur{' '}
        {formatFraisInscription(totalRepasAttendu)} attendus
      </p>
    </div>
  );
}
