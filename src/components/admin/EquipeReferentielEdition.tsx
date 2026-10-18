import { useState } from 'react';
import type { EquipeRef } from '../../api/types/inscription.types';
import { NOM_COMPLET_MAX, NOM_COURT_MAX } from '../../pages/inscription/equipeCreationErreur';
import {
  construireModification,
  estNomCourtVerrouille,
  type ModificationEquipe,
} from '../../pages/inscription/equipeModification';

interface EquipeReferentielEditionProps {
  equipe: EquipeRef;
  enCours: boolean;
  erreur: string | null;
  onEnregistrer: (modification: ModificationEquipe) => void;
  onAnnuler: () => void;
}

const CHAMP =
  'w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400';

/** Modification des noms d'une équipe. Ne connaît ni l'API ni le cache. */
export default function EquipeReferentielEdition({
  equipe,
  enCours,
  erreur,
  onEnregistrer,
  onAnnuler,
}: EquipeReferentielEditionProps) {
  const [nom, setNom] = useState(equipe.nom);
  const [nomComplet, setNomComplet] = useState(equipe.nomComplet ?? '');

  // Recalculé à chaque rendu : l'équipe peut se verrouiller pendant l'édition
  // (candidature soumise entre-temps, liste rechargée après le refus).
  const verrouille = estNomCourtVerrouille(equipe);
  const nbCandidatures = equipe.nbCandidatures ?? 0;
  const modification = construireModification(equipe, nom, nomComplet);
  const nomId = `equipe-${equipe.id}-nom`;
  const nomCompletId = `equipe-${equipe.id}-nom-complet`;
  const verrouId = `equipe-${equipe.id}-verrou`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!modification) return;
    onEnregistrer(modification);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="block text-sm font-medium mb-1 text-slate-200" htmlFor={nomId}>
          Nom court
        </label>
        <input
          id={nomId}
          type="text"
          maxLength={NOM_COURT_MAX}
          className={`${CHAMP} ${verrouille ? 'opacity-60 cursor-not-allowed' : ''}`}
          value={verrouille ? equipe.nom : nom}
          onChange={(e) => setNom(e.target.value)}
          readOnly={verrouille}
          disabled={enCours}
          aria-describedby={verrouille ? verrouId : undefined}
        />
        {verrouille && (
          <p id={verrouId} className="mt-1 text-xs text-amber-300">
            Nom court non modifiable : {nbCandidatures} candidature
            {nbCandidatures > 1 ? 's font' : ' fait'} référence à cette équipe.
          </p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-slate-200" htmlFor={nomCompletId}>
          Nom complet (optionnel)
        </label>
        <input
          id={nomCompletId}
          type="text"
          maxLength={NOM_COMPLET_MAX}
          className={CHAMP}
          value={nomComplet}
          onChange={(e) => setNomComplet(e.target.value)}
          disabled={enCours}
        />
      </div>
      {erreur && (
        <div
          role="alert"
          className="bg-red-900/40 border border-red-500/60 text-red-200 rounded p-3 text-sm"
        >
          {erreur}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enCours || !modification || (!verrouille && !nom.trim())}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-950 transition"
        >
          {enCours ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={onAnnuler}
          disabled={enCours}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
