import { useMatchLive } from "../../hooks/useMatchLive";
import ChronoDisplay from "./ChronoDisplay";

type Props = {
  numMatch: number;
  equipe1Nom?: string;
  equipe2Nom?: string;
};

const ETAT_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  ANNONCE: "Annoncé",
  EN_COURS: "En cours",
  EN_PAUSE: "Pause",
  TERMINE: "Terminé",
};

export default function ScoreBoard({ numMatch, equipe1Nom, equipe2Nom }: Props) {
  const { data } = useMatchLive(numMatch);

  if (!data || data.matchLive.etat === "PLANIFIE") return null;

  const { matchLive, penalites } = data;
  const activePenalites = penalites.filter((p) => p.active);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400 uppercase">
        <span>Score en direct</span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            matchLive.etat === "EN_COURS"
              ? "bg-emerald-900 text-emerald-300"
              : matchLive.etat === "TERMINE"
              ? "bg-slate-700 text-slate-300"
              : "bg-amber-900 text-amber-300"
          }`}
        >
          {ETAT_LABELS[matchLive.etat] ?? matchLive.etat}
        </span>
      </div>

      <div className="flex items-center justify-center gap-6 text-3xl font-bold text-slate-100">
        <span className="flex-1 text-right truncate text-base font-medium text-slate-300">
          {equipe1Nom ?? "Equipe 1"}
        </span>
        <span className="tabular-nums" data-testid="match-live-score">
          {matchLive.score1Cache}
          <span className="text-slate-500 mx-2">-</span>
          {matchLive.score2Cache}
        </span>
        <span className="flex-1 text-left truncate text-base font-medium text-slate-300">
          {equipe2Nom ?? "Equipe 2"}
        </span>
      </div>

      <div className="flex justify-center">
        <ChronoDisplay
          tempsEcouleSecondes={matchLive.tempsEcouleSecondes}
          chronoEnCours={matchLive.chronoEnCours}
          chronoDerniereMajAt={matchLive.chronoDerniereMajAt}
        />
      </div>

      {activePenalites.length > 0 && (
        <div className="border-t border-slate-800 pt-2 text-xs text-amber-400 space-y-1">
          {activePenalites.map((p) => (
            <div key={p.id} className="flex justify-between">
              <span>Pénalité équipe {p.equipeId}</span>
              <span>{p.dureeMinutes} min — {p.typePenaliteCode}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
