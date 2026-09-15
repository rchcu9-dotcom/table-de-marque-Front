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

function numberField(value: number | null): string {
  return value == null ? "" : String(value);
}

function parseOptionalInt(value: string): number | null {
  if (value.trim() === "") return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

export default function ParametresTemporelsForm({
  parametres,
  onSave,
  isSaving,
  readOnly = false,
}: Props) {
  const [dureeSurfacageMin, setDureeSurfacageMin] = useState(
    parametres.dureeSurfacageMin,
  );
  const [dureeMatchPouleMin, setDureeMatchPouleMin] = useState(
    parametres.dureeMatchPouleMin,
  );
  const [dureeMatchFinalMin, setDureeMatchFinalMin] = useState(
    parametres.dureeMatchFinalMin,
  );
  const [dureeInterMatchMin, setDureeInterMatchMin] = useState(
    numberField(parametres.dureeInterMatchMin),
  );
  const [nbPatinoires, setNbPatinoires] = useState(
    numberField(parametres.nbPatinoires),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      dureeSurfacageMin,
      dureeMatchPouleMin,
      dureeMatchFinalMin,
      dureeInterMatchMin: parseOptionalInt(dureeInterMatchMin),
      nbPatinoires: parseOptionalInt(nbPatinoires),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-slate-200 font-medium text-sm">
        Durées et patinoires
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-slate-400 space-y-1">
          Durée surfaçage (min)
          <input
            type="number"
            value={dureeSurfacageMin}
            onChange={(e) => setDureeSurfacageMin(parseInt(e.target.value, 10) || 0)}
            disabled={readOnly}
            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm disabled:opacity-50"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Durée match poule (min)
          <input
            type="number"
            value={dureeMatchPouleMin}
            onChange={(e) => setDureeMatchPouleMin(parseInt(e.target.value, 10) || 0)}
            disabled={readOnly}
            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm disabled:opacity-50"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Durée match final (min)
          <input
            type="number"
            value={dureeMatchFinalMin}
            onChange={(e) => setDureeMatchFinalMin(parseInt(e.target.value, 10) || 0)}
            disabled={readOnly}
            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm disabled:opacity-50"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Battement inter-match (min)
          <input
            type="number"
            value={dureeInterMatchMin}
            placeholder="défaut : 0"
            onChange={(e) => setDureeInterMatchMin(e.target.value)}
            disabled={readOnly}
            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm disabled:opacity-50"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Patinoires
          <input
            type="number"
            value={nbPatinoires}
            placeholder="défaut : 3"
            onChange={(e) => setNbPatinoires(e.target.value)}
            disabled={readOnly}
            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm disabled:opacity-50"
          />
        </label>
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
