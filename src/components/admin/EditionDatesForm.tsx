import type { UpdateEditionPayload } from "../../api/inscription";
import type { EditionValidationError } from "../../utils/editionValidation";

type DateField = "dateDebut" | "dateFinDebut";

type Props = {
  values: Pick<UpdateEditionPayload, DateField>;
  errors: EditionValidationError[];
  onChange: <K extends DateField>(field: K, value: UpdateEditionPayload[K]) => void;
};

function toDateInputValue(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function errorFor(errors: EditionValidationError[], field: DateField): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}

export default function EditionDatesForm({ values, errors, onChange }: Props) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-slate-200 font-medium text-sm mb-2">
        Dates du tournoi
      </legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-slate-400 space-y-1">
          Début du tournoi
          <input
            type="date"
            value={toDateInputValue(values.dateDebut)}
            onChange={(e) =>
              onChange("dateDebut", e.target.value ? `${e.target.value}T00:00:00` : undefined)
            }
            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Fin du tournoi
          <input
            type="date"
            value={toDateInputValue(values.dateFinDebut)}
            onChange={(e) =>
              onChange("dateFinDebut", e.target.value ? `${e.target.value}T23:59:59` : undefined)
            }
            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
          />
          {errorFor(errors, "dateFinDebut") && (
            <span className="block text-red-400">{errorFor(errors, "dateFinDebut")}</span>
          )}
        </label>
      </div>
    </fieldset>
  );
}
