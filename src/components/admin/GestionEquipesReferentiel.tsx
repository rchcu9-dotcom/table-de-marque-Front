import { useState } from 'react';
import type { EquipeRef } from '../../api/types/inscription.types';
import {
  useActiverEquipeReferentiel,
  useDesactiverEquipeReferentiel,
  useEquipesReferentielToutes,
  useModifierEquipeReferentiel,
} from '../../hooks/useEquipesReferentiel';
import {
  filtrerEquipesReferentiel,
  type FiltreEtatEquipe,
} from '../../pages/inscription/equipesRecherche';
import {
  messageErreurModificationEquipe,
  type ModificationEquipe,
} from '../../pages/inscription/equipeModification';
import Spinner from '../ds/Spinner';
import AideGestionEquipes from './AideGestionEquipes';
import ConfirmModal from './ConfirmModal';
import EquipeReferentielEdition from './EquipeReferentielEdition';
import EquipeReferentielLigne from './EquipeReferentielLigne';

const FILTRES: { etat: FiltreEtatEquipe; label: string }[] = [
  { etat: 'toutes', label: 'Toutes' },
  { etat: 'actives', label: 'Actives' },
  { etat: 'desactivees', label: 'Désactivées' },
];

/**
 * Liste complète du référentiel des équipes pour l'organisateur : recherche,
 * modification des noms, activation et désactivation
 * (docs/specs/recommandations-finales-contexte-la-mise-en-place-de-la-colo.md).
 */
export default function GestionEquipesReferentiel({ token }: { token: string }) {
  const { data: equipes, isLoading, isError, refetch } = useEquipesReferentielToutes(token);
  const modifier = useModifierEquipeReferentiel(token);
  const activer = useActiverEquipeReferentiel(token);
  const desactiver = useDesactiverEquipeReferentiel(token);

  const [saisie, setSaisie] = useState('');
  const [etat, setEtat] = useState<FiltreEtatEquipe>('toutes');
  // Une seule équipe en édition à la fois.
  const [enEdition, setEnEdition] = useState<number | null>(null);
  const [aDesactiver, setADesactiver] = useState<EquipeRef | null>(null);

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3 text-sm">
        <p className="text-red-400">Impossible de charger les équipes.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (isLoading || !equipes) {
    return (
      <div className="flex items-center gap-2 text-slate-300 text-sm">
        <Spinner />
        <span>Chargement…</span>
      </div>
    );
  }

  const visibles = filtrerEquipesReferentiel(equipes, saisie, etat);
  const occupe = modifier.isPending || activer.isPending || desactiver.isPending;
  const nbCandidaturesADesactiver = aDesactiver?.nbCandidatures ?? 0;

  function ouvrirEdition(id: number | null) {
    modifier.reset();
    setEnEdition(id);
  }

  function enregistrer(id: number, data: ModificationEquipe) {
    modifier.mutate({ id, data }, { onSuccess: () => setEnEdition(null) });
  }

  function confirmerDesactivation() {
    if (!aDesactiver) return;
    desactiver.mutate(aDesactiver.id, { onSettled: () => setADesactiver(null) });
  }

  return (
    <div className="flex flex-col gap-4">
      <AideGestionEquipes />

      <div className="flex flex-col gap-3">
        <div>
          <label
            className="block text-sm font-medium mb-1 text-slate-200"
            htmlFor="equipes-recherche"
          >
            Rechercher une équipe
          </label>
          <input
            id="equipes-recherche"
            type="search"
            className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Nom court ou nom complet"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Filtrer par état" className="flex gap-1">
            {FILTRES.map((filtre) => (
              <button
                key={filtre.etat}
                type="button"
                aria-pressed={etat === filtre.etat}
                onClick={() => setEtat(filtre.etat)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  etat === filtre.etat
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {filtre.label}
              </button>
            ))}
          </div>
          <p className="ml-auto text-xs text-slate-400">
            {visibles.length === equipes.length
              ? `${equipes.length} équipe${equipes.length > 1 ? 's' : ''}`
              : `${visibles.length} sur ${equipes.length} équipe${equipes.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {(activer.isError || desactiver.isError) && (
        <div
          role="alert"
          className="bg-red-900/40 border border-red-500/60 text-red-200 rounded p-3 text-sm"
        >
          Le changement d'état n'a pas pu être enregistré. Réessaie.
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune équipe trouvée.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibles.map((equipe) => (
            <li
              key={equipe.id}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 min-w-0"
            >
              {enEdition === equipe.id ? (
                <EquipeReferentielEdition
                  equipe={equipe}
                  enCours={modifier.isPending}
                  erreur={
                    modifier.isError ? messageErreurModificationEquipe(modifier.error) : null
                  }
                  onEnregistrer={(data) => enregistrer(equipe.id, data)}
                  onAnnuler={() => ouvrirEdition(null)}
                />
              ) : (
                <EquipeReferentielLigne
                  equipe={equipe}
                  occupe={occupe}
                  onModifier={() => ouvrirEdition(equipe.id)}
                  onActiver={() => activer.mutate(equipe.id)}
                  onDemanderDesactivation={() => setADesactiver(equipe)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {aDesactiver && (
        <ConfirmModal
          title={`Désactiver « ${aDesactiver.nom} » ?`}
          message={
            <>
              <p>
                L'équipe ne sera plus proposée aux responsables dans le parcours d'inscription.
                Tu pourras la réactiver ici à tout moment.
              </p>
              {nbCandidaturesADesactiver > 0 && (
                <p className="mt-2 text-amber-300">
                  {nbCandidaturesADesactiver} candidature
                  {nbCandidaturesADesactiver > 1 ? 's font' : ' fait'} référence à cette équipe.
                  La désactivation ne les modifie pas : leur traitement continue normalement.
                </p>
              )}
            </>
          }
          confirmingLabel="Désactivation..."
          onClose={() => setADesactiver(null)}
          onConfirm={confirmerDesactivation}
          submitting={desactiver.isPending}
        />
      )}
    </div>
  );
}
