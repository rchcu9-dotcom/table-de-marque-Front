import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import {
  useInscriptionSession,
  EDITION_QUERY_KEY,
} from '../hooks/useInscriptionSession';
import { demarrerTournoi } from '../api/inscription';
import {
  useEquipesReferentielToutes,
  useActiverEquipeReferentiel,
} from '../hooks/useEquipesReferentiel';
import { useEditionEnPreparation } from '../hooks/useEditionEnPreparation';
import NouvelleSaisonPanel from '../components/admin/NouvelleSaisonPanel';
import PhaseCycleFrise from '../components/admin/PhaseCycleFrise';
import ConfirmModal from '../components/admin/ConfirmModal';

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

        {etape && etape !== 'TOURNOI_DEMARRE' && (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-slate-300">
              {etape === 'INSCRIPTIONS_OUVERTES'
                ? 'Les inscriptions sont ouvertes.'
                : etape === 'CLOTUREE'
                  ? 'Les inscriptions sont fermées.'
                  : "Les inscriptions ne sont pas encore ouvertes."}
            </p>
            <Link
              to="/admin/parametres-inscription"
              className="text-sm text-emerald-400 hover:text-emerald-300 underline"
            >
              Gérer dans Paramètres d'inscription
            </Link>
          </div>
        )}

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
