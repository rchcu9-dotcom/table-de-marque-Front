import type { FormatGroupe, FormatLien, FormatPlace } from '../../api/formatGraphe';
import LienPicker from './LienPicker';

type Props = {
  place: FormatPlace;
  roleLabel: 'Vainqueur' | 'Perdant' | null;
  lien: FormatLien | undefined;
  groupesDisponibles: FormatGroupe[];
  onSupprimerPlace: (placeId: number) => void;
  onDefinirLien: (groupeSourceId: number, rangSource: number, groupeCibleId: number) => void;
  onEliminer: (groupeSourceId: number, rangSource: number) => void;
  onReinitialiserLien: (groupeSourceId: number, rangSource: number) => void;
  isLoading: boolean;
};

export default function PlaceRow({
  place,
  roleLabel,
  lien,
  groupesDisponibles,
  onSupprimerPlace,
  onDefinirLien,
  onEliminer,
  onReinitialiserLien,
  isLoading,
}: Props) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-slate-700 last:border-0">
      <span className="text-slate-400 text-xs w-5 text-right shrink-0">{place.position}</span>

      <div className="flex-1 min-w-0">
        {roleLabel && (
          <span
            className={
              roleLabel === 'Vainqueur'
                ? 'mr-2 text-xs font-semibold text-emerald-400'
                : 'mr-2 text-xs font-semibold text-slate-500'
            }
          >
            {roleLabel}
          </span>
        )}
        <span className="text-slate-200 text-xs font-medium">
          {place.origine === 'ALIAS'
            ? (place.aliasLabel ?? `Place ${place.position}`)
            : `Lien entrant #${place.lienEntrantId ?? '?'}`}
        </span>
        <span className="ml-2 text-xs text-slate-500">
          ({place.origine === 'ALIAS' ? 'Equipe' : 'Issue dun match'})
        </span>

        {lien && (
          <div className="mt-1">
            <LienPicker
              lien={lien}
              groupesDisponibles={groupesDisponibles}
              onDefinir={(groupeCibleId) =>
                onDefinirLien(place.groupeId, place.position, groupeCibleId)
              }
              onEliminer={() => onEliminer(place.groupeId, place.position)}
              onReinitialiser={() => onReinitialiserLien(place.groupeId, place.position)}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>

      {place.origine === 'ALIAS' && (
        <button
          type="button"
          onClick={() => onSupprimerPlace(place.id)}
          disabled={isLoading}
          className="text-xs text-slate-500 hover:text-red-400 disabled:opacity-50 shrink-0"
        >
          Retirer
        </button>
      )}
    </div>
  );
}
