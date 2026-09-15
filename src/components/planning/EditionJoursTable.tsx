import { useState } from "react";
import type { EditionJour, TypeJournee } from "../../api/parametresSportifs";

type Props = {
  jours: EditionJour[];
  onUpsert: (payload: {
    numeroJour: number;
    date: string;
    heureDebut: string;
    heureFin: string;
    typeJournee: TypeJournee;
  }) => void;
  onDelete: (numeroJour: number) => void;
  isSaving: boolean;
  readOnly?: boolean;
};

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

function toTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combine(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

const TYPES: TypeJournee[] = ["5V5", "3V3", "MIXTE"];

function JourForm({
  numeroJour,
  jour,
  onUpsert,
  onCancel,
  isSaving,
  readOnly = false,
}: {
  numeroJour: number;
  jour: EditionJour | undefined;
  onUpsert: Props["onUpsert"];
  onCancel?: () => void;
  isSaving: boolean;
  readOnly?: boolean;
}) {
  const [date, setDate] = useState(jour ? toDateInput(jour.date) : "");
  const [heureDebut, setHeureDebut] = useState(
    jour ? toTimeInput(jour.heureDebut) : "09:00",
  );
  const [heureFin, setHeureFin] = useState(
    jour ? toTimeInput(jour.heureFin) : "21:30",
  );
  const [typeJournee, setTypeJournee] = useState<TypeJournee>(
    jour?.typeJournee ?? "5V5",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    onUpsert({
      numeroJour,
      date,
      heureDebut: combine(date, heureDebut),
      heureFin: combine(date, heureFin),
      typeJournee,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 px-2 py-2 rounded bg-slate-800 border border-slate-600"
    >
      <span className="text-slate-300 text-sm font-medium w-10">
        J{numeroJour}
      </span>
      <label className="text-xs text-slate-400 space-y-1">
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={readOnly}
          className="block px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm disabled:opacity-50"
          required
        />
      </label>
      <label className="text-xs text-slate-400 space-y-1">
        Début
        <input
          type="time"
          value={heureDebut}
          onChange={(e) => setHeureDebut(e.target.value)}
          disabled={readOnly}
          className="block px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm disabled:opacity-50"
        />
      </label>
      <label className="text-xs text-slate-400 space-y-1">
        Fin
        <input
          type="time"
          value={heureFin}
          onChange={(e) => setHeureFin(e.target.value)}
          disabled={readOnly}
          className="block px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm disabled:opacity-50"
        />
      </label>
      <label className="text-xs text-slate-400 space-y-1">
        Type
        <select
          value={typeJournee}
          onChange={(e) => setTypeJournee(e.target.value as TypeJournee)}
          disabled={readOnly}
          className="block px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm disabled:opacity-50"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      {!readOnly && (
        <button
          type="submit"
          disabled={isSaving}
          className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium disabled:opacity-50"
        >
          {jour ? "Modifier" : "Créer"}
        </button>
      )}
      {!readOnly && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium"
        >
          Annuler
        </button>
      )}
    </form>
  );
}

export default function EditionJoursTable({
  jours,
  onUpsert,
  onDelete,
  isSaving,
  readOnly = false,
}: Props) {
  const joursTries = [...jours].sort((a, b) => a.numeroJour - b.numeroJour);
  const [showAddForm, setShowAddForm] = useState(false);
  const [nombreJoursPrecedent, setNombreJoursPrecedent] = useState(jours.length);

  if (jours.length !== nombreJoursPrecedent) {
    if (jours.length > nombreJoursPrecedent) {
      setShowAddForm(false);
    }
    setNombreJoursPrecedent(jours.length);
  }

  const prochainNumero =
    joursTries.length > 0
      ? joursTries[joursTries.length - 1].numeroJour + 1
      : 1;

  return (
    <div className="space-y-2">
      <h3 className="text-slate-200 font-medium text-sm">
        Jours de compétition
      </h3>
      {joursTries.map((jour) => (
        <div key={jour.numeroJour} className="flex items-center gap-2">
          <div className="flex-1">
            <JourForm
              numeroJour={jour.numeroJour}
              jour={jour}
              onUpsert={onUpsert}
              isSaving={isSaving}
              readOnly={readOnly}
            />
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onDelete(jour.numeroJour)}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              Supprimer
            </button>
          )}
        </div>
      ))}
      {!readOnly &&
        (showAddForm ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <JourForm
                numeroJour={prochainNumero}
                jour={undefined}
                onUpsert={onUpsert}
                onCancel={() => setShowAddForm(false)}
                isSaving={isSaving}
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium"
          >
            + Ajouter un jour
          </button>
        ))}
    </div>
  );
}
