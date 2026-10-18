import { useState } from 'react';
import type { JoueurDossier } from '../../api/types/inscription.types';
import { useListControls } from '../../hooks/useListControls';
import {
  RECHERCHE_JOUEURS,
  TRIS_JOUEURS,
  type ColonneTri,
  type TriJoueurs,
} from './joueursListe';

interface JoueursTableProps {
  joueurs: JoueurDossier[];
  readOnly: boolean;
  onEdit: (joueur: JoueurDossier) => void;
  onDelete: (joueur: JoueurDossier) => void;
}

/**
 * Tableau compact des joueurs d'un dossier : tri par clic sur l'en-tête (N°,
 * Nom, Prénom), recherche sur nom + prénom. Sur mobile, l'année et les
 * particularités alimentaires passent sous la ligne.
 *
 * Rend un fragment (titre + tableau) : le parent fournit la <section>, qui
 * contient aussi le formulaire d'ajout.
 */
export function JoueursTable({ joueurs, readOnly, onEdit, onDelete }: JoueursTableProps) {
  const controls = useListControls<JoueurDossier, TriJoueurs>({
    items: joueurs,
    searchKeys: RECHERCHE_JOUEURS,
    sorters: TRIS_JOUEURS,
    defaultSort: 'nom',
  });
  const { results, query, setQuery, sort, setSort, isFiltered, total } = controls;
  const [suppressionId, setSuppressionId] = useState<number | null>(null);

  const colonneActive = sort.replace(/-desc$/, '') as ColonneTri;
  const descendant = sort.endsWith('-desc');

  function trierPar(colonne: ColonneTri) {
    setSort(colonne === colonneActive && !descendant ? `${colonne}-desc` : colonne);
  }

  function enTete(colonne: ColonneTri, libelle: string, className = '') {
    const actif = colonne === colonneActive;
    return (
      <th
        scope="col"
        aria-sort={actif ? (descendant ? 'descending' : 'ascending') : 'none'}
        className={`px-2 py-1.5 font-medium ${className}`}
      >
        <button
          type="button"
          onClick={() => trierPar(colonne)}
          className="inline-flex items-center gap-1 hover:text-slate-100"
        >
          {libelle}
          <span aria-hidden="true" className={actif ? '' : 'opacity-0'}>
            {actif && descendant ? '↓' : '↑'}
          </span>
        </button>
      </th>
    );
  }

  return (
    <>
      <h4 className="text-sm font-medium text-slate-200">
        {isFiltered ? `Joueurs (${results.length} sur ${total})` : `Joueurs (${total})`}
      </h4>

      {total > 0 && (
        <>
          <div>
            <label htmlFor="recherche-joueurs" className="sr-only">
              Rechercher un joueur
            </label>
            <input
              id="recherche-joueurs"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un joueur"
              className="w-full border border-slate-600 rounded px-2 py-1 text-sm bg-slate-700 text-slate-100 placeholder-slate-400"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-200">
              <thead className="text-xs text-slate-400 border-b border-slate-600">
                <tr>
                  {enTete('numero', 'N°', 'w-12')}
                  {enTete('nom', 'Nom')}
                  {enTete('prenom', 'Prénom')}
                  <th scope="col" className="px-2 py-1.5 font-medium">Poste</th>
                  <th scope="col" className="px-2 py-1.5 font-medium hidden sm:table-cell">Année</th>
                  {!readOnly && (
                    <th scope="col" className="px-2 py-1.5 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {results.map((j) => (
                  <tr key={j.id} className="border-b border-slate-700/60 align-top">
                    <td className="px-2 py-1.5 tabular-nums">{j.numero}</td>
                    <td className="px-2 py-1.5">
                      {j.nom}
                      {/* Détail mobile : colonnes masquées sous 640 px. */}
                      {(j.anneeNaissance || j.particularitesAlim) && (
                        <div className="sm:hidden text-xs text-slate-400">
                          {[j.anneeNaissance, j.particularitesAlim].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      {j.particularitesAlim && (
                        <div className="hidden sm:block text-xs text-slate-400">
                          {j.particularitesAlim}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">{j.prenom}</td>
                    <td className="px-2 py-1.5">{j.poste}</td>
                    <td className="px-2 py-1.5 hidden sm:table-cell tabular-nums">
                      {j.anneeNaissance ?? '—'}
                    </td>
                    {!readOnly && (
                      <td className="px-2 py-1.5 whitespace-nowrap text-right">
                        {suppressionId === j.id ? (
                          <span className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSuppressionId(null);
                                onDelete(j);
                              }}
                              className="text-xs text-red-400 hover:text-red-300 hover:underline"
                            >
                              Confirmer la suppression
                            </button>
                            <button
                              type="button"
                              onClick={() => setSuppressionId(null)}
                              className="text-xs text-slate-400 hover:underline"
                            >
                              Annuler
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={() => onEdit(j)}
                              aria-label={`Modifier ${j.prenom} ${j.nom}`}
                              className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => setSuppressionId(j.id)}
                              aria-label={`Supprimer ${j.prenom} ${j.nom}`}
                              className="text-xs text-red-400 hover:text-red-300 hover:underline"
                            >
                              Supprimer
                            </button>
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {results.length === 0 && (
            <p className="text-xs text-slate-400">
              Aucun joueur ne correspond à « {query} ».{' '}
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-blue-400 hover:underline"
              >
                Effacer la recherche
              </button>
            </p>
          )}
        </>
      )}
    </>
  );
}
