import { useState } from 'react';
import type { Edition } from '../../api/types/inscription.types';
import {
  useChangerEtapeInscriptions,
  estConflitEtat,
  MESSAGE_CONFLIT_ETAT,
  type ActionInscriptions,
} from '../../hooks/useChangerEtapeInscriptions';
import { viewFromEtape } from '../../utils/inscriptionsSwitchView';
import ConfirmModal from './ConfirmModal';

interface Props {
  edition: Pick<Edition, 'id' | 'etape'>;
  token: string;
}

function MessageFermeture() {
  return (
    <div className="flex flex-col gap-2">
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li>Plus aucune nouvelle équipe ne pourra candidater.</li>
        <li>
          Les candidatures déjà déposées restent traitables par l'organisateur, et les
          référents ayant une candidature peuvent continuer à renseigner leur dossier.
        </li>
        <li>
          Les référents qui ont sélectionné une équipe sans avoir lancé leur demande ne
          pourront plus la soumettre.
        </li>
        <li>Action réversible tant que le tournoi n'est pas démarré.</li>
      </ul>
    </div>
  );
}

export default function InscriptionsSwitch({ edition, token }: Props) {
  const view = viewFromEtape(edition.etape);
  const changer = useChangerEtapeInscriptions(edition.id, token);
  const [modale, setModale] = useState<'fermeture' | 'reouverture' | null>(null);

  const bloque = view.disabled || changer.isPending;

  const lancer = (action: ActionInscriptions) => {
    changer.mutate(action, { onSettled: () => setModale(null) });
  };

  const handleToggle = () => {
    if (bloque || !view.action) return;
    changer.reset();
    if (view.confirm === 'fermeture' || view.confirm === 'reouverture') {
      setModale(view.confirm);
      return;
    }
    lancer(view.action);
  };

  const erreur = changer.error
    ? estConflitEtat(changer.error)
      ? MESSAGE_CONFLIT_ETAT
      : "Impossible de modifier l'état des inscriptions."
    : null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={view.checked}
          aria-disabled={bloque}
          aria-describedby="inscriptions-switch-hint"
          aria-label={view.label}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
            view.checked ? 'bg-emerald-500' : 'bg-slate-600'
          } ${bloque ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
              view.checked ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
        <span className="text-sm font-semibold text-slate-100">{view.label}</span>
      </div>
      <p id="inscriptions-switch-hint" className="text-xs text-slate-400">
        {view.hint}
      </p>
      {erreur && (
        <p role="alert" className="text-xs text-red-400">
          {erreur}
        </p>
      )}

      {modale === 'fermeture' && (
        <ConfirmModal
          title="Fermer les inscriptions ?"
          message={<MessageFermeture />}
          confirmingLabel="Fermeture…"
          onClose={() => setModale(null)}
          onConfirm={() => lancer('cloturer')}
          submitting={changer.isPending}
        />
      )}
      {modale === 'reouverture' && (
        <ConfirmModal
          title="Rouvrir les inscriptions ?"
          message="Les onglets Planning et Équipes disparaîtront temporairement."
          confirmingLabel="Ouverture…"
          onClose={() => setModale(null)}
          onConfirm={() => lancer('ouvrir')}
          submitting={changer.isPending}
        />
      )}
    </div>
  );
}
