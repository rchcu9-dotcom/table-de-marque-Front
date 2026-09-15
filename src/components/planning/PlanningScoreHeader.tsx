import type { SimulationResult } from "../../api/planning";

type Props = {
  simulation: SimulationResult;
};

export default function PlanningScoreHeader({ simulation }: Props) {
  const genere = new Date(simulation.generatedAt).toLocaleString("fr-FR");
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
      <span>
        Score : penalty=
        <span className="text-slate-200 font-mono">
          {simulation.score.penalty}
        </span>{" "}
        · slack=
        <span className="text-slate-200 font-mono">
          {simulation.score.slack}
        </span>
      </span>
      <span>Généré le {genere}</span>
      {simulation.mode.parametresParDefautUtilises.length > 0 && (
        <span className="text-amber-400">
          Valeurs par défaut non confirmées :{" "}
          {simulation.mode.parametresParDefautUtilises.join(", ")}
        </span>
      )}
      {simulation.mode.effectifComplete && (
        <span className="text-amber-400">Effectif complété par des équipes fictives</span>
      )}
    </div>
  );
}
