import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useInscriptionSession } from '../hooks/useInscriptionSession';
import {
  useEquipesReferentielToutes,
  useActiverEquipeReferentiel,
} from '../hooks/useEquipesReferentiel';
import { useEditionEnPreparation } from '../hooks/useEditionEnPreparation';
import AjouterEquipeReferentielPanel from '../components/admin/AjouterEquipeReferentielPanel';
import { EquipeNoms } from './inscription/EquipeNoms';
import PilotageTournoi from '../components/admin/PilotageTournoi';
import { outilMisEnAvant, type OutilAdmin } from '../utils/editionTransitions';

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
            <EquipeNoms
              nom={equipe.nom}
              nomComplet={equipe.nomComplet}
              className="flex-1 text-sm text-slate-100"
            />
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

function LienOutil({
  to,
  label,
  misEnAvant,
}: {
  to: string;
  label: string;
  misEnAvant: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center justify-between gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition ${
        misEnAvant
          ? 'bg-slate-800 hover:bg-slate-700 ring-2 ring-emerald-500'
          : 'bg-slate-800 hover:bg-slate-700'
      }`}
    >
      {label}
      {misEnAvant && (
        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-slate-950">
          Utile maintenant
        </span>
      )}
    </Link>
  );
}

export default function AdminPage() {
  const { token } = useAuth();
  const { role, edition, isLoading } = useInscriptionSession();
  const navigate = useNavigate();
  // Dédupliqué avec les autres pages admin via le cache TanStack Query (même
  // queryKey EDITION_EN_PREPARATION_QUERY_KEY).
  const { data: editionEnPreparation } = useEditionEnPreparation(token);

  useEffect(() => {
    if (!isLoading && role !== 'ORGANISATEUR') {
      navigate('/', { replace: true });
    }
  }, [isLoading, role, navigate]);

  if (role !== 'ORGANISATEUR') {
    return null;
  }

  // Édition pilotée : celle en préparation si elle existe, sinon l'active.
  // Les outils la ciblent (les pages de paramètres appliquent la même règle).
  const editionPilotee = editionEnPreparation ?? edition;
  const outil: OutilAdmin | null = editionPilotee ? outilMisEnAvant(editionPilotee.etape) : null;
  const parametresSportifsUrl =
    editionPilotee?.etape === 'TOURNOI_DEMARRE'
      ? '/admin/parametres-sportifs?edition=demarree'
      : '/admin/parametres-sportifs';

  return (
    <div className="max-w-md mx-auto px-4 py-12 flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-white">Administration</h1>

      {token && (
        <PilotageTournoi
          token={token}
          editionActive={edition}
          editionEnPreparation={editionEnPreparation ?? null}
        />
      )}

      <div className="border-t border-slate-800 pt-4 mt-2 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Outils</h2>
        <LienOutil
          to="/admin/parametres-inscription"
          label="Paramètres d'inscription"
          misEnAvant={outil === 'PARAMETRES_INSCRIPTION'}
        />
        <LienOutil
          to={parametresSportifsUrl}
          label="Paramètres sportifs"
          misEnAvant={outil === 'PARAMETRES_SPORTIFS'}
        />
        <LienOutil
          to="/admin/planning/simulation"
          label="Simulation de planning"
          misEnAvant={outil === 'SIMULATION_PLANNING'}
        />
        <LienOutil
          to="/admin/presentation-tournoi"
          label="Présentation du tournoi"
          misEnAvant={outil === 'PRESENTATION'}
        />
        <LienOutil to="/admin/equipes" label="Équipes du référentiel" misEnAvant={false} />
      </div>

      {token && <AjouterEquipeReferentielPanel token={token} />}
      {token && <EquipesDesactiveesPanel token={token} />}
    </div>
  );
}
