import { useState } from 'react';
import type { FormatGroupe, FormatGroupeFormule, FormatLien } from '../../api/formatGraphe';
import PlaceRow from './PlaceRow';

type Props = {
  groupe: FormatGroupe;
  groupesAutresPhases: FormatGroupe[];
  onModifierNom: (groupeId: number, nom: string) => void;
  onModifierFormule?: (groupeId: number, formule: FormatGroupeFormule) => void;
  onSupprimerGroupe: (groupeId: number) => void;
  onAjouterPlace: (groupeId: number) => void;
  onSupprimerPlace: (placeId: number) => void;
  onDefinirLien: (groupeSourceId: number, rangSource: number, groupeCibleId: number) => void;
  onEliminer: (groupeSourceId: number, rangSource: number) => void;
  onReinitialiserLien: (groupeSourceId: number, rangSource: number) => void;
  isLoading: boolean;
};

export default function GroupeCard({
  groupe,
  groupesAutresPhases,
  onModifierNom,
  onModifierFormule = () => {},
  onSupprimerGroupe,
  onAjouterPlace,
  onSupprimerPlace,
  onDefinirLien,
  onEliminer,
  onReinitialiserLien,
  isLoading,
}: Props) {
  const [editingNom, setEditingNom] = useState(false);
  const [nomDraft, setNomDraft] = useState(groupe.nom);

  function handleNomBlur() {
    setEditingNom(false);
    if (nomDraft.trim() && nomDraft !== groupe.nom) {
      onModifierNom(groupe.id, nomDraft.trim());
    }
  }

  const placesTriees = [...groupe.places].sort((a, b) => a.position - b.position);
  const liensParRang = new Map<number, FormatLien>(
    groupe.liens.map((l) => [l.rangSource, l]),
  );

  const isMatchUnique = placesTriees.length === 2;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-2">
      {/* En-tete */}
      <div className="flex items-center gap-2">
        {editingNom ? (
          <input
            autoFocus
            value={nomDraft}
            onChange={(e) => setNomDraft(e.target.value)}
            onBlur={handleNomBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNomBlur(); }}
            className="flex-1 bg-slate-700 border border-blue-500 rounded px-2 py-0.5 text-sm text-slate-100 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingNom(true)}
            className="flex-1 text-left text-slate-200 text-sm font-semibold hover:text-white"
          >
            {groupe.nom}
          </button>
        )}
        {isMatchUnique ? (
          <span className="text-xs text-slate-500 shrink-0">MATCH UNIQUE</span>
        ) : (
          <select
            value={groupe.formule ?? 'CHAMPIONNAT'}
            onChange={(e) =>
              onModifierFormule(groupe.id, e.target.value as FormatGroupeFormule)
            }
            disabled={isLoading}
            className="text-xs bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-slate-300 shrink-0 disabled:opacity-50"
          >
            <option value="CHAMPIONNAT">Championnat</option>
            <option value="RONDE_SUISSE">Ronde suisse</option>
          </select>
        )}
        <button
          type="button"
          onClick={() => onSupprimerGroupe(groupe.id)}
          disabled={isLoading}
          className="text-xs text-slate-500 hover:text-red-400 disabled:opacity-50 shrink-0"
        >
          Supprimer
        </button>
      </div>

      {/* Places */}
      <div>
        {placesTriees.map((place) => (
          <PlaceRow
            key={place.id}
            place={place}
            roleLabel={
              isMatchUnique ? (place.position === 1 ? 'Vainqueur' : 'Perdant') : null
            }
            lien={liensParRang.get(place.position)}
            groupesDisponibles={groupesAutresPhases}
            onSupprimerPlace={onSupprimerPlace}
            onDefinirLien={onDefinirLien}
            onEliminer={onEliminer}
            onReinitialiserLien={onReinitialiserLien}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Ajouter une place */}
      <button
        type="button"
        onClick={() => onAjouterPlace(groupe.id)}
        disabled={isLoading}
        className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
      >
        + Ajouter une place
      </button>
    </div>
  );
}
