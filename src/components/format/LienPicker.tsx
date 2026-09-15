import type { FormatGroupe, FormatLien, FormatLienEtat } from '../../api/formatGraphe';

type Props = {
  lien: FormatLien;
  groupesDisponibles: FormatGroupe[];
  onDefinir: (groupeCibleId: number) => void;
  onEliminer: () => void;
  onReinitialiser: () => void;
  isLoading: boolean;
};

function etatLabel(etat: FormatLienEtat): string {
  switch (etat) {
    case 'LIE': return 'Lie';
    case 'ELIMINE': return 'Elimine';
    case 'NON_DEFINI': return 'Non defini';
  }
}

function etatClass(etat: FormatLienEtat): string {
  switch (etat) {
    case 'LIE': return 'text-green-400';
    case 'ELIMINE': return 'text-red-400';
    case 'NON_DEFINI': return 'text-amber-400';
  }
}

export default function LienPicker({
  lien,
  groupesDisponibles,
  onDefinir,
  onEliminer,
  onReinitialiser,
  isLoading,
}: Props) {
  function handleSelectGroupe(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = Number(e.target.value);
    if (val > 0) onDefinir(val);
  }

  const groupeCibleNom = lien.groupeCibleId != null
    ? groupesDisponibles.find((g) => g.id === lien.groupeCibleId)?.nom ?? `Groupe #${lien.groupeCibleId}`
    : null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`text-xs font-medium ${etatClass(lien.etat)}`}>
        {etatLabel(lien.etat)}
        {groupeCibleNom ? ` → ${groupeCibleNom}` : ''}
      </span>

      {lien.etat !== 'ELIMINE' && (
        <>
          <select
            defaultValue={0}
            onChange={handleSelectGroupe}
            disabled={isLoading}
            className="bg-slate-700 border border-slate-600 rounded px-2 py-0.5 text-xs text-slate-100 focus:outline-none"
          >
            <option value={0} disabled>Lier vers…</option>
            {groupesDisponibles.map((g) => (
              <option key={g.id} value={g.id}>{g.nom}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={onEliminer}
            disabled={isLoading}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            Eliminer
          </button>
        </>
      )}

      {lien.etat !== 'NON_DEFINI' && (
        <button
          type="button"
          onClick={onReinitialiser}
          disabled={isLoading}
          className="text-xs text-slate-400 hover:text-slate-300 disabled:opacity-50"
        >
          Reinitialiser
        </button>
      )}
    </div>
  );
}
