import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { normaliserRecherche } from '../utils/recherche';

// Réexport : la fonction vivait ici avant d'être partagée par toutes les recherches.
export { normaliserRecherche };

/**
 * Recherche / filtre multi-valeurs / tri d'une petite liste, entièrement côté
 * navigateur (quelques dizaines d'éléments : pas de pagination ni d'appel back).
 *
 * L'état vit soit dans l'URL (`url` fourni : survit au F5, au bouton retour et
 * au partage de lien), soit en local (ex. tableau des joueurs dans un panneau).
 * En mode URL, les écritures utilisent `replace` : une frappe dans la
 * recherche ne doit pas empiler une entrée d'historique par caractère.
 */

/** Comparateur de noms en français (accents, casse, nombres dans les noms). */
export const collatorFr = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

export type SearchKey<T> = keyof T | ((item: T) => string | null | undefined);

export interface UseListControlsOptions<T, S extends string> {
  items: readonly T[];
  searchKeys: readonly SearchKey<T>[];
  sorters: Record<S, (a: T, b: T) => number>;
  defaultSort: S;
  /** Valeur de l'élément pour le filtre multi-sélection (ex. statut). */
  filterValue?: (item: T) => string;
  /**
   * Noms des paramètres d'URL ; absent = état local. `searchKeys`, `sorters`
   * et `filterValue` doivent être stables (constantes de module) pour que la
   * mémoïsation joue.
   */
  url?: { q: string; sort: string; filter?: string };
}

export interface ListControls<T, S extends string> {
  query: string;
  setQuery: (q: string) => void;
  sort: S;
  setSort: (s: S) => void;
  /** Valeurs sélectionnées dans le filtre ; vide = « Tous ». */
  selected: string[];
  toggleFilter: (value: string) => void;
  clearFilter: () => void;
  reset: () => void;
  /** Nombre d'éléments de la liste complète par valeur de filtre. */
  counts: Record<string, number>;
  results: T[];
  total: number;
  isFiltered: boolean;
}

interface EtatListe {
  q: string;
  sort: string | null;
  filter: string[];
}

const ETAT_VIDE: EtatListe = { q: '', sort: null, filter: [] };

function lireValeur<T>(item: T, key: SearchKey<T>): string {
  const v = typeof key === 'function' ? key(item) : item[key];
  return v == null ? '' : String(v);
}

export function useListControls<T, S extends string>(
  options: UseListControlsOptions<T, S>,
): ListControls<T, S> {
  const { items, searchKeys, sorters, defaultSort, filterValue, url } = options;
  const [searchParams, setSearchParams] = useSearchParams();
  const [etatLocal, setEtatLocal] = useState<EtatListe>(ETAT_VIDE);

  const etat: EtatListe = url
    ? {
        q: searchParams.get(url.q) ?? '',
        sort: searchParams.get(url.sort),
        filter: url.filter
          ? (searchParams.get(url.filter) ?? '').split(',').filter(Boolean)
          : [],
      }
    : etatLocal;

  const ecrire = useCallback(
    (patch: Partial<EtatListe>) => {
      if (!url) {
        setEtatLocal((prev) => ({ ...prev, ...patch }));
        return;
      }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const poser = (cle: string | undefined, valeur: string | null) => {
            if (!cle) return;
            if (valeur) next.set(cle, valeur);
            else next.delete(cle);
          };
          if ('q' in patch) poser(url.q, patch.q ?? null);
          if ('sort' in patch) poser(url.sort, patch.sort ?? null);
          if ('filter' in patch) poser(url.filter, (patch.filter ?? []).join(','));
          return next;
        },
        { replace: true },
      );
    },
    [url, setSearchParams],
  );

  // Un tri inconnu (lien partagé obsolète, URL modifiée à la main) retombe
  // sur le tri par défaut plutôt que de casser la liste.
  const sort = (etat.sort && etat.sort in sorters ? etat.sort : defaultSort) as S;
  const query = etat.q;
  const selected = etat.filter;

  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    if (!filterValue) return acc;
    for (const item of items) {
      const v = filterValue(item);
      acc[v] = (acc[v] ?? 0) + 1;
    }
    return acc;
  }, [items, filterValue]);

  const results = useMemo(() => {
    const needle = normaliserRecherche(query);
    const filtres = new Set(selected);
    const filtered = items.filter((item) => {
      if (filterValue && filtres.size > 0 && !filtres.has(filterValue(item))) {
        return false;
      }
      if (!needle) return true;
      return searchKeys.some((key) =>
        normaliserRecherche(lireValeur(item, key)).includes(needle),
      );
    });
    return filtered.sort(sorters[sort]);
    // `selected` est recréé à chaque rendu en mode URL : on dépend de sa forme sérialisée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, selected.join(','), sort, sorters, searchKeys, filterValue]);

  const toggleFilter = useCallback(
    (value: string) => {
      const next = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
      ecrire({ filter: next });
    },
    [selected, ecrire],
  );

  return {
    query,
    setQuery: (q) => ecrire({ q }),
    sort,
    setSort: (s) => ecrire({ sort: s === defaultSort ? null : s }),
    selected,
    toggleFilter,
    clearFilter: () => ecrire({ filter: [] }),
    // Le tri n'est pas un filtre : il ne réduit pas la liste, on le conserve.
    reset: () => ecrire({ q: '', filter: [] }),
    counts,
    results,
    total: items.length,
    isFiltered: query.trim() !== '' || selected.length > 0,
  };
}
