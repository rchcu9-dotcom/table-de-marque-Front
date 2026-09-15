import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import {
  useInscriptionSession,
  EDITION_QUERY_KEY,
} from '../hooks/useInscriptionSession';
import { demarrerTournoi, updateEditionEtape } from '../api/inscription';
import {
  useEquipesReferentielToutes,
  useActiverEquipeReferentiel,
} from '../hooks/useEquipesReferentiel';
import { useEditionEnPreparation } from '../hooks/useEditionEnPreparation';
import NouvelleSaisonPanel from '../components/admin/NouvelleSaisonPanel';
import PhaseCycleFrise from '../components/admin/PhaseCycleFrise';

function EquipesDesactiveesPanel({ token }: { token: string }) {
  const { data: equipes, isLoading, isError } = useEquipesReferentielToutes(token);
  const activer = useActiverEquipeReferentiel(token);
  const desactivees = (equipes ?? []).filter((e) => !e.active);

  if (isLoading || isError || desactivees.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-slate-800 pt-4 mt-2 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
        Équipes désactivées ({desactivees.length})
      </h2>
      <p className="text-xs text-slate-500">
        Désactivées manuellement par un organisateur (doublon, erreur de saisie, nom
        inapproprié) — invisibles dans le référentiel public et non sélectionnables pour
        candidater tant qu'elles ne sont pas réactivées ici.
      </p>
      <ul className="flex flex-col gap-2">
        {desactivees.map((equipe) => (
          <li
            key={equipe.id}
            className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
          >
            {equipe.logoUrl && (
              <img src={equipe.logoUrl} alt="" className="w-8 h-8 object-contain rounded-full" />
            )}
            <span className="flex-1 text-sm text-slate-100">{equipe.nom}</span>
            <button
              type="button"
              onClick={() => activer.mutate(equipe.id)}
              disabled={activer.isPending}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-950 transition"
            >
              Activer
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmingLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

function ConfirmModal({
  title,
  message,
  confirmingLabel,
  onClose,
  onConfirm,
  submitting,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-sm w-full flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-slate-300">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50 transition"
          >
            {submitting ? confirmingLabel : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { token } = useAuth();
  const { role, edition, etape, isLoading } = useInscriptionSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Dédupliqué avec l'appel de NouvelleSaisonPanel via le cache TanStack Query (même
  // queryKey EDITION_EN_PREPARATION_QUERY_KEY) — un seul appel réseau même si les deux
  // composants montent le hook.
  const { data: editionEnPreparation } = useEditionEnPreparation(token);

  // Lancer le tournoi (CLOTUREE -> TOURNOI_DEMARRE, seule voie : demarrerTournoi)
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clôturer les inscriptions (INSCRIPTIONS_OUVERTES -> CLOTUREE)
  const [showConfirmCloture, setShowConfirmCloture] = useState(false);
  const [submittingCloture, setSubmittingCloture] = useState(false);
  const [errorCloture, setErrorCloture] = useState<string | null>(null);

  // Ouvrir les inscriptions (CREEE -> INSCRIPTIONS_OUVERTES)
  const [submittingOuverture, setSubmittingOuverture] = useState(false);
  const [errorOuverture, setErrorOuverture] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && role !== 'ORGANISATEUR') {
      navigate('/', { replace: true });
    }
  }, [isLoading, role, navigate]);

  if (role !== 'ORGANISATEUR') {
    return null;
  }

  const handleConfirm = async () => {
    if (!edition || !token) return;
    setSubmitting(true);
    setError(null);
    try {
      await demarrerTournoi(edition.id, token);
      await queryClient.invalidateQueries({ queryKey: EDITION_QUERY_KEY });
      setShowConfirm(false);
    } catch {
      setError('Impossible de démarrer le tournoi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOuvrirInscriptions = async () => {
    if (!edition || !token) return;
    setSubmittingOuverture(true);
    setErrorOuverture(null);
    try {
      await updateEditionEtape(edition.id, 'INSCRIPTIONS_OUVERTES', token);
      await queryClient.invalidateQueries({ queryKey: EDITION_QUERY_KEY });
    } catch {
      setErrorOuverture("Impossible d'ouvrir les inscriptions.");
    } finally {
      setSubmittingOuverture(false);
    }
  };

  const handleConfirmCloture = async () => {
    if (!edition || !token) return;
    setSubmittingCloture(true);
    setErrorCloture(null);
    try {
      await updateEditionEtape(edition.id, 'CLOTUREE', token);
      await queryClient.invalidateQueries({ queryKey: EDITION_QUERY_KEY });
      setShowConfirmCloture(false);
    } catch {
      setErrorCloture('Impossible de clôturer les inscriptions.');
    } finally {
      setSubmittingCloture(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-white">Administration</h1>

      <PhaseCycleFrise etape={etape} />

      {editionEnPreparation ? (
        <span
          aria-disabled="true"
          title="Édition en préparation en cours — utilisez le lien « Paramètres d'inscription » ci-dessous, qui cible cette édition."
          className="bg-slate-800/50 rounded-lg px-4 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed select-none"
        >
          Paramètres d'inscription
        </span>
      ) : (
        <Link
          to="/admin/parametres-inscription"
          className="bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-3 text-sm font-semibold text-white transition"
        >
          Paramètres d'inscription
        </Link>
      )}

      <Link
        to="/admin/parametres-sportifs?edition=demarree"
        className="bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-3 text-sm font-semibold text-white transition"
      >
        Paramètres sportifs
      </Link>

      <Link
        to="/admin/planning/simulation"
        className="bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-3 text-sm font-semibold text-white transition"
      >
        Simulation de planning
      </Link>

      <Link
        to="/admin/presentation-tournoi"
        className="bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-3 text-sm font-semibold text-white transition"
      >
        Présentation du tournoi
      </Link>

      {token && <EquipesDesactiveesPanel token={token} />}

      <div className="border-t border-slate-800 pt-4 mt-2 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Phase de l'édition — {etape ?? '…'}
        </h2>

        {etape === 'CREEE' && (
          <button
            type="button"
            onClick={() => void handleOuvrirInscriptions()}
            disabled={submittingOuverture}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg px-4 py-3 text-sm font-semibold text-slate-950 transition"
          >
            {submittingOuverture ? 'Ouverture…' : 'Ouvrir les inscriptions'}
          </button>
        )}
        {errorOuverture && <p className="text-sm text-red-400">{errorOuverture}</p>}

        {etape === 'INSCRIPTIONS_OUVERTES' && (
          <button
            type="button"
            onClick={() => setShowConfirmCloture(true)}
            className="bg-orange-500 hover:bg-orange-400 rounded-lg px-4 py-3 text-sm font-semibold text-slate-950 transition"
          >
            Clôturer les inscriptions
          </button>
        )}
        {errorCloture && <p className="text-sm text-red-400">{errorCloture}</p>}

        {etape === 'CLOTUREE' && (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="bg-amber-500 hover:bg-amber-400 rounded-lg px-4 py-3 text-sm font-semibold text-slate-950 transition"
          >
            Lancer le tournoi
          </button>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {etape === 'TOURNOI_DEMARRE' && (
          <p className="text-sm text-slate-400">
            Le tournoi est démarré : les dossiers sont gelés, aucune autre
            transition n'est possible sur cette édition.
          </p>
        )}
      </div>

      {etape === 'TOURNOI_DEMARRE' && edition && token && (
        <NouvelleSaisonPanel token={token} editionActiveId={edition.id} />
      )}

      {showConfirmCloture && (
        <ConfirmModal
          title="Clôturer les inscriptions ?"
          message="Plus aucune nouvelle équipe ne pourra candidater, et les référents dont le dossier n'est pas complet perdront l'accès à l'inscription. Cette action peut être suivie du lancement du tournoi."
          confirmingLabel="Clôture…"
          onClose={() => setShowConfirmCloture(false)}
          onConfirm={() => void handleConfirmCloture()}
          submitting={submittingCloture}
        />
      )}

      {showConfirm && (
        <ConfirmModal
          title="Lancer le tournoi ?"
          message="Cette action est irréversible : tous les dossiers d'inscription seront définitivement gelés (plus aucune modification possible)."
          confirmingLabel="Lancement…"
          onClose={() => setShowConfirm(false)}
          onConfirm={() => void handleConfirm()}
          submitting={submitting}
        />
      )}
    </div>
  );
}
