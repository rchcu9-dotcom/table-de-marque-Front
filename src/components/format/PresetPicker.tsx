import { useState } from 'react';
import type { FormatPhaseFinale, GenererPresetPayload } from '../../api/formatGraphe';

type Props = {
  modifieManuellement: boolean;
  onGenerer: (payload: GenererPresetPayload) => void;
  isLoading: boolean;
};

const PRESETS: { value: FormatPhaseFinale; label: string }[] = [
  { value: 'ELIMINATION_DIRECTE', label: 'Elimination directe' },
  { value: 'POULES_FINALES', label: 'Poules + Finales' },
  { value: 'CLASSEMENT_CROISE', label: 'Classement croise' },
];

export default function PresetPicker({ modifieManuellement, onGenerer, isLoading }: Props) {
  const [preset, setPreset] = useState<FormatPhaseFinale>('ELIMINATION_DIRECTE');
  const [nbPoules, setNbPoules] = useState(2);
  const [nbEquipesParPoule, setNbEquipesParPoule] = useState(4);
  const [nbEquipesQualifieesParPoule, setNbEquipesQualifieesParPoule] = useState(2);
  const [forcerEcrasement, setForcerEcrasement] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onGenerer({
      preset,
      nbPoules,
      nbEquipesParPoule,
      nbEquipesQualifieesParPoule,
      forcer: forcerEcrasement,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-slate-200 font-semibold text-sm">Generer depuis un preset</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Format</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as FormatPhaseFinale)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PRESETS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Nb poules</label>
          <input
            type="number"
            min={1}
            max={8}
            value={nbPoules}
            onChange={(e) => setNbPoules(Number(e.target.value))}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Equipes / poule</label>
          <input
            type="number"
            min={2}
            max={8}
            value={nbEquipesParPoule}
            onChange={(e) => setNbEquipesParPoule(Number(e.target.value))}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Qualifies / poule</label>
          <input
            type="number"
            min={1}
            max={8}
            value={nbEquipesQualifieesParPoule}
            onChange={(e) => setNbEquipesQualifieesParPoule(Number(e.target.value))}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {modifieManuellement && (
        <label className="flex items-center gap-2 text-xs text-amber-300 cursor-pointer">
          <input
            type="checkbox"
            checked={forcerEcrasement}
            onChange={(e) => setForcerEcrasement(e.target.checked)}
            className="rounded"
          />
          Ecraser les modifications manuelles
        </label>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
      >
        {isLoading ? 'Generation…' : 'Generer le graphe'}
      </button>
    </form>
  );
}
