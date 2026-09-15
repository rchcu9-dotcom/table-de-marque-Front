import type { UpdateEditionPayload } from "../../api/inscription";
import type { EditionValidationError } from "../../utils/editionValidation";

type Field = "nom" | "categorie";

type Props = {
  values: Pick<UpdateEditionPayload, Field>;
  errors: EditionValidationError[];
  onChange: <K extends Field>(field: K, value: UpdateEditionPayload[K]) => void;
};

function toInputValue(value?: string | null): string {
  return value ?? "";
}

function errorFor(errors: EditionValidationError[], field: Field): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}

export default function EditionIdentiteForm({ values, errors, onChange }: Props) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-slate-200 font-medium text-sm mb-2">Identité du tournoi</legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-slate-400 space-y-1">
          Nom du tournoi
          <input
            type="text"
            value={toInputValue(values.nom)}
            onChange={(e) => onChange("nom", e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
          />
          {errorFor(errors, "nom") && (
            <span className="block text-red-400">{errorFor(errors, "nom")}</span>
          )}
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Catégorie
          <input
            type="text"
            value={toInputValue(values.categorie)}
            onChange={(e) => onChange("categorie", e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
          />
          {errorFor(errors, "categorie") && (
            <span className="block text-red-400">{errorFor(errors, "categorie")}</span>
          )}
        </label>
      </div>
    </fieldset>
  );
}
