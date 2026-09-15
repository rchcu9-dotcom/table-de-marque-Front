import type { UpdateEditionPayload } from "../../api/inscription";
import type { EditionValidationError } from "../../utils/editionValidation";

type NumberField = "fraisInscription" | "prixRepas" | "nbPlacesMax";

type Props = {
  values: Pick<UpdateEditionPayload, NumberField>;
  errors: EditionValidationError[];
  onChange: <K extends NumberField>(field: K, value: UpdateEditionPayload[K]) => void;
};

function toInputValue(value?: number): string {
  return value == null ? "" : String(value);
}

function parseOptionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

function errorFor(errors: EditionValidationError[], field: NumberField): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}

export default function EditionTarifsForm({ values, errors, onChange }: Props) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-slate-200 font-medium text-sm mb-2">Tarifs & places</legend>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-xs text-slate-400 space-y-1">
          Frais d'inscription (€)
          <input
            type="number"
            min={0}
            step="0.01"
            value={toInputValue(values.fraisInscription)}
            onChange={(e) => onChange("fraisInscription", parseOptionalNumber(e.target.value))}
            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
          />
          {errorFor(errors, "fraisInscription") && (
            <span className="block text-red-400">{errorFor(errors, "fraisInscription")}</span>
          )}
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Prix du repas (€)
          <input
            type="number"
            min={0}
            step="0.01"
            value={toInputValue(values.prixRepas)}
            onChange={(e) => onChange("prixRepas", parseOptionalNumber(e.target.value))}
            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
          />
          {errorFor(errors, "prixRepas") && (
            <span className="block text-red-400">{errorFor(errors, "prixRepas")}</span>
          )}
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Nombre de places max
          <input
            type="number"
            min={0}
            value={toInputValue(values.nbPlacesMax)}
            onChange={(e) => onChange("nbPlacesMax", parseOptionalNumber(e.target.value))}
            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
          />
          {errorFor(errors, "nbPlacesMax") && (
            <span className="block text-red-400">{errorFor(errors, "nbPlacesMax")}</span>
          )}
        </label>
      </div>
    </fieldset>
  );
}
