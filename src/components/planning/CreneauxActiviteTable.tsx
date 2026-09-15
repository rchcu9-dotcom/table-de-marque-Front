import { useState } from "react";
import type {
  ActiviteCatalogue,
  CreneauActivite,
  UpsertCreneauActivitePayload,
} from "../../api/parametresSportifs";

type Props = {
  creneaux: CreneauActivite[];
  activitesCatalogue: ActiviteCatalogue[];
  onCreate: (payload: UpsertCreneauActivitePayload) => void;
  onUpdate: (id: number, payload: UpsertCreneauActivitePayload) => void;
  onDelete: (id: number) => void;
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

function CreneauForm({
  creneau,
  activitesCatalogue,
  onSubmit,
  onCancel,
  isSaving,
  readOnly = false,
}: {
  creneau: CreneauActivite | undefined;
  activitesCatalogue: ActiviteCatalogue[];
  onSubmit: (payload: UpsertCreneauActivitePayload, nbExemplaires: number) => void;
  onCancel?: () => void;
  isSaving: boolean;
  readOnly?: boolean;
}) {
  const [activiteId, setActiviteId] = useState(
    creneau?.activiteId ?? activitesCatalogue[0]?.id ?? 0,
  );
  const [date, setDate] = useState(creneau ? toDateInput(creneau.date) : "");
  const [heureDebut, setHeureDebut] = useState(
    creneau ? toTimeInput(creneau.heureDebut) : "12:00",
  );
  const [dureeMin, setDureeMin] = useState(
    creneau?.dureeMin ??
      activitesCatalogue.find((a) => a.id === activiteId)?.dureeParEquipeMin ??
      40,
  );
  const [prefillCapacite, setPrefillCapacite] = useState(true);

  const activiteChoisie = activitesCatalogue.find((a) => a.id === activiteId);
  const capacite = activiteChoisie?.capaciteParallele ?? 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !activiteId) return;
    const payload: UpsertCreneauActivitePayload = {
      activiteId,
      date,
      heureDebut: combine(date, heureDebut),
      dureeMin,
    };
    const nbExemplaires = !creneau && prefillCapacite ? capacite : 1;
    onSubmit(payload, nbExemplaires);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 px-2 py-2 rounded bg-slate-800 border border-slate-600"
    >
      <label className="text-xs text-slate-400 space-y-1">
        Activité
        <select
          value={activiteId}
          onChange={(e) => setActiviteId(parseInt(e.target.value, 10))}
          disabled={readOnly}
          className="block px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm disabled:opacity-50"
        >
          {activitesCatalogue.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
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
        Heure
        <input
          type="time"
          value={heureDebut}
          onChange={(e) => setHeureDebut(e.target.value)}
          disabled={readOnly}
          className="block px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm disabled:opacity-50"
        />
      </label>
      <label className="text-xs text-slate-400 space-y-1">
        Durée (min)
        <input
          type="number"
          min={1}
          value={dureeMin}
          onChange={(e) => setDureeMin(parseInt(e.target.value, 10) || 0)}
          disabled={readOnly}
          className="block px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm w-24 disabled:opacity-50"
        />
      </label>
      {!readOnly && !creneau && capacite > 1 && (
        <label className="text-xs text-slate-400 flex items-center gap-1">
          <input
            type="checkbox"
            checked={prefillCapacite}
            onChange={(e) => setPrefillCapacite(e.target.checked)}
          />
          Pré-remplir {capacite} créneaux identiques (capacité parallèle)
        </label>
      )}
      {!readOnly && (
        <button
          type="submit"
          disabled={isSaving}
          className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium disabled:opacity-50"
        >
          {creneau ? "Modifier" : "Créer"}
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

export default function CreneauxActiviteTable({
  creneaux,
  activitesCatalogue,
  onCreate,
  onUpdate,
  onDelete,
  isSaving,
  readOnly = false,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const creneauxTries = [...creneaux].sort(
    (a, b) => new Date(a.heureDebut).getTime() - new Date(b.heureDebut).getTime(),
  );

  const handleCreate = (payload: UpsertCreneauActivitePayload, nbExemplaires: number) => {
    for (let i = 0; i < nbExemplaires; i++) onCreate(payload);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-slate-200 font-medium text-sm">Créneaux d'activité</h3>
      {creneauxTries.map((creneau) => (
        <div key={creneau.id} className="flex items-center gap-2">
          <div className="flex-1">
            <CreneauForm
              creneau={creneau}
              activitesCatalogue={activitesCatalogue}
              onSubmit={(payload) => onUpdate(creneau.id, payload)}
              isSaving={isSaving}
              readOnly={readOnly}
            />
          </div>
          {creneau.statut === "CONFIRME" && (
            <span className="text-xs text-emerald-400">
              Confirmé — {creneau.equipeLabel ?? `#${creneau.equipeId}`}
            </span>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={() => onDelete(creneau.id)}
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
              <CreneauForm
                creneau={undefined}
                activitesCatalogue={activitesCatalogue}
                onSubmit={handleCreate}
                onCancel={() => setShowAddForm(false)}
                isSaving={isSaving}
              />
            </div>
          </div>
        ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          disabled={activitesCatalogue.length === 0}
          className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium disabled:opacity-50"
        >
          + Ajouter un créneau
        </button>
        ))}
    </div>
  );
}
