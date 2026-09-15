import { useState } from "react";
import type {
  ParametresSportifs,
  UpdateParametresSportifsPayload,
} from "../../api/parametresSportifs";

type Props = {
  parametres: ParametresSportifs;
  onSave: (payload: UpdateParametresSportifsPayload) => void;
  isSaving: boolean;
  readOnly?: boolean;
};

const TIE_BREAK_LABELS: Record<string, string> = {
  points: "Points",
  difference_buts: "Différence de buts",
  buts_marques: "Buts marqués",
  confrontation_directe: "Confrontation directe",
};

const DEFAULT_TIE_BREAK = [
  "points",
  "difference_buts",
  "buts_marques",
  "confrontation_directe",
];

export default function FormatCompetitionForm({
  parametres,
  onSave,
  isSaving,
  readOnly = false,
}: Props) {
  const [reglesTieBreak, setReglesTieBreak] = useState<string[]>(
    parametres.reglesTieBreak ?? DEFAULT_TIE_BREAK,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      reglesTieBreak,
    });
  };

  const deplacerCritere = (index: number, direction: -1 | 1) => {
    const cible = index + direction;
    if (cible < 0 || cible >= reglesTieBreak.length) return;
    const copie = [...reglesTieBreak];
    [copie[index], copie[cible]] = [copie[cible], copie[index]];
    setReglesTieBreak(copie);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-slate-200 font-medium text-sm">
        Format de compétition
      </h3>

      <div>
        <a
          href={readOnly ? "/admin/format-competition?edition=demarree" : "/admin/format-competition"}
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium"
        >
          Constructeur graphique du format de competition →
        </a>
        <p className="text-xs text-slate-500 mt-1">
          Definissez visuellement les phases, groupes et liens du tournoi.
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-slate-400">
          Ordre des critères de départage
        </p>
        <ol className="space-y-1">
          {reglesTieBreak.map((critere, index) => (
            <li
              key={critere}
              className="flex items-center justify-between px-2 py-1 rounded bg-slate-800 border border-slate-600 text-sm text-slate-200"
            >
              <span>
                {index + 1}. {TIE_BREAK_LABELS[critere] ?? critere}
              </span>
              {!readOnly && (
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => deplacerCritere(index, -1)}
                    disabled={index === 0}
                    className="text-slate-400 hover:text-slate-200 disabled:opacity-30 text-xs px-1"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => deplacerCritere(index, 1)}
                    disabled={index === reglesTieBreak.length - 1}
                    className="text-slate-400 hover:text-slate-200 disabled:opacity-30 text-xs px-1"
                  >
                    ↓
                  </button>
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>

      {!readOnly && (
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
        >
          Enregistrer
        </button>
      )}
    </form>
  );
}
