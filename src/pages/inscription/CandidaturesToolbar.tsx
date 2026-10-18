import type {
  CandidatureOrganisateur,
  StatutInscription,
} from '../../api/types/inscription.types';
import type { ListControls } from '../../hooks/useListControls';
import { OPTIONS_TRI_CANDIDATURES, type TriCandidatures } from './candidaturesListe';
import { ORDRE_PARCOURS_STATUT, STATUT_CONFIG } from './statutConfig';

interface CandidaturesToolbarProps {
  controls: ListControls<CandidatureOrganisateur, TriCandidatures>;
}

/**
 * Barre d'outils collante de la liste admin : recherche, filtre par statut
 * (pastilles multi-sélection avec compteurs sur la liste complète), tri et
 * compteur de résultats annoncé aux lecteurs d'écran.
 */
export function CandidaturesToolbar({ controls }: CandidaturesToolbarProps) {
  const { query, setQuery, sort, setSort, selected, toggleFilter, clearFilter, counts } =
    controls;

  // On n'affiche que les statuts présents (ou déjà sélectionnés via l'URL) :
  // huit pastilles dont la moitié à 0 encombreraient l'écran mobile.
  const statutsAffiches = ORDRE_PARCOURS_STATUT.filter(
    (s) => (counts[s] ?? 0) > 0 || selected.includes(s),
  );

  return (
    <div
      role="search"
      aria-label="Filtrer les candidatures"
      className="sticky top-0 z-20 -mx-4 px-4 py-3 space-y-2 bg-slate-900/95 backdrop-blur border-b border-slate-700"
    >
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <label htmlFor="recherche-candidatures" className="sr-only">
            Rechercher une équipe, un référent ou un e-mail
          </label>
          <input
            id="recherche-candidatures"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Équipe, référent ou e-mail…"
            className="w-full border border-slate-600 rounded px-3 py-1.5 pr-8 text-sm bg-slate-800 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Effacer la recherche"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded text-slate-400 hover:text-slate-100"
            >
              ×
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          Trier par
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as TriCandidatures)}
            className="border border-slate-600 rounded px-2 py-1.5 text-sm bg-slate-800 text-slate-100"
          >
            {OPTIONS_TRI_CANDIDATURES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap gap-1.5">
        <PastilleStatut
          label="Tous"
          count={controls.total}
          active={selected.length === 0}
          onClick={clearFilter}
        />
        {statutsAffiches.map((s: StatutInscription) => (
          <PastilleStatut
            key={s}
            label={STATUT_CONFIG[s].label}
            count={counts[s] ?? 0}
            active={selected.includes(s)}
            onClick={() => toggleFilter(s)}
          />
        ))}
      </div>

      <ResultatsCompteur controls={controls} />
    </div>
  );
}

function PastilleStatut({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full border text-xs font-medium transition ${
        active
          ? 'bg-blue-600 border-blue-500 text-white'
          : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {label} <span className="opacity-75">({count})</span>
    </button>
  );
}

function ResultatsCompteur({
  controls,
}: {
  controls: ListControls<CandidatureOrganisateur, TriCandidatures>;
}) {
  const { results, total, isFiltered, reset } = controls;
  return (
    <div className="flex items-center justify-between text-xs text-slate-400">
      <p aria-live="polite" aria-atomic="true">
        {results.length} {results.length > 1 ? 'équipes' : 'équipe'} sur {total}
      </p>
      {isFiltered && (
        <button
          type="button"
          onClick={reset}
          className="text-blue-400 hover:text-blue-300 hover:underline"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
