import { useState } from "react";
import type { SimulationResult } from "../../api/planning";

type Props = {
  onSimuler: (nbEquipesCible: number | undefined) => void;
  onExporter: () => void;
  onConfirmer: (forcerEquipesFictives: boolean) => void;
  simulation: SimulationResult | null;
  isSimulating: boolean;
  isExporting: boolean;
  isConfirming: boolean;
};

export default function SimulationControls({
  onSimuler,
  onExporter,
  onConfirmer,
  simulation,
  isSimulating,
  isExporting,
  isConfirming,
}: Props) {
  const [nbEquipesCible, setNbEquipesCible] = useState("");

  const nbFictives = simulation?.equipes.filter((e) => e.fictive).length ?? 0;
  const forcerRequis = nbFictives > 0;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-xs text-slate-400 space-y-1">
        Nb équipes cible (optionnel)
        <input
          type="number"
          value={nbEquipesCible}
          onChange={(e) => setNbEquipesCible(e.target.value)}
          placeholder="défaut : nb places max"
          className="block w-40 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
        />
      </label>

      <button
        type="button"
        onClick={() =>
          onSimuler(
            nbEquipesCible.trim() ? parseInt(nbEquipesCible, 10) : undefined,
          )
        }
        disabled={isSimulating}
        className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
      >
        {isSimulating ? "Simulation en cours…" : "Simuler"}
      </button>

      <button
        type="button"
        onClick={onExporter}
        disabled={!simulation || isExporting}
        className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium disabled:opacity-50"
      >
        Exporter
      </button>

      <button
        type="button"
        onClick={() => onConfirmer(forcerRequis)}
        disabled={!simulation || isConfirming}
        className="px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
        title={
          forcerRequis
            ? `${nbFictives} équipe(s) fictive(s) — la confirmation forcera leur exclusion des matchs confirmés`
            : undefined
        }
      >
        {forcerRequis ? "Confirmer malgré les équipes fictives" : "Confirmer"}
      </button>
    </div>
  );
}
