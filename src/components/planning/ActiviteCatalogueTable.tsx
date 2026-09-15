import { useState } from "react";
import type {
  ActiviteCatalogue,
  UpsertActiviteCataloguePayload,
} from "../../api/parametresSportifs";

type Props = {
  activites: ActiviteCatalogue[];
  onCreate: (payload: UpsertActiviteCataloguePayload) => void;
  onUpdate: (id: number, payload: UpsertActiviteCataloguePayload) => void;
  onDelete: (id: number) => void;
  isSaving: boolean;
  readOnly?: boolean;
};

function ActiviteForm({
  activite,
  onSubmit,
  onCancel,
  isSaving,
  readOnly = false,
}: {
  activite: ActiviteCatalogue | undefined;
  onSubmit: (payload: UpsertActiviteCataloguePayload) => void;
  onCancel?: () => void;
  isSaving: boolean;
  readOnly?: boolean;
}) {
  const [label, setLabel] = useState(activite?.label ?? "");
  const [dureeParEquipeMin, setDureeParEquipeMin] = useState(
    activite?.dureeParEquipeMin ?? 40,
  );
  const [capaciteParallele, setCapaciteParallele] = useState(
    activite?.capaciteParallele ?? 1,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSubmit({ label: label.trim(), dureeParEquipeMin, capaciteParallele });
    if (!activite) {
      setLabel("");
      setDureeParEquipeMin(40);
      setCapaciteParallele(1);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 px-2 py-2 rounded bg-slate-800 border border-slate-600"
    >
      <label className="text-xs text-slate-400 space-y-1">
        Label
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={readOnly}
          className="block px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm disabled:opacity-50"
          required
        />
      </label>
      <label className="text-xs text-slate-400 space-y-1">
        Durée / équipe (min)
        <input
          type="number"
          min={1}
          value={dureeParEquipeMin}
          onChange={(e) => setDureeParEquipeMin(parseInt(e.target.value, 10) || 0)}
          disabled={readOnly}
          className="block px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm w-28 disabled:opacity-50"
        />
      </label>
      <label className="text-xs text-slate-400 space-y-1">
        Capacité parallèle
        <input
          type="number"
          min={1}
          value={capaciteParallele}
          onChange={(e) => setCapaciteParallele(parseInt(e.target.value, 10) || 1)}
          disabled={readOnly}
          className="block px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm w-28 disabled:opacity-50"
        />
      </label>
      {!readOnly && (
        <button
          type="submit"
          disabled={isSaving}
          className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium disabled:opacity-50"
        >
          {activite ? "Modifier" : "Créer"}
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

export default function ActiviteCatalogueTable({
  activites,
  onCreate,
  onUpdate,
  onDelete,
  isSaving,
  readOnly = false,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="space-y-2">
      <h3 className="text-slate-200 font-medium text-sm">
        Catalogue d'Activités
      </h3>
      {activites.map((activite) => (
        <div key={activite.id} className="flex items-center gap-2">
          <div className="flex-1">
            <ActiviteForm
              activite={activite}
              onSubmit={(payload) => onUpdate(activite.id, payload)}
              isSaving={isSaving}
              readOnly={readOnly}
            />
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onDelete(activite.id)}
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
              <ActiviteForm
                activite={undefined}
                onSubmit={onCreate}
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
            + Ajouter une activité
          </button>
        ))}
    </div>
  );
}
