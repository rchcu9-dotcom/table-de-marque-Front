import type { UpdateEditionPayload } from "../../api/inscription";

type ContactField = "contactEmail" | "contactPhone";
type ImageField = "imageUrl" | "imageDossierUrl" | "imageRibUrl";
type Field = ContactField | ImageField;

type Props = {
  values: Pick<UpdateEditionPayload, Field>;
  onChange: <K extends Field>(field: K, value: UpdateEditionPayload[K]) => void;
};

function toInputValue(value?: string | null): string {
  return value ?? "";
}

export default function EditionContactImagesForm({ values, onChange }: Props) {
  return (
    <div className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="text-slate-200 font-medium text-sm mb-2">Contact</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-400 space-y-1">
            Email de contact
            <input
              type="email"
              value={toInputValue(values.contactEmail)}
              onChange={(e) => onChange("contactEmail", e.target.value)}
              className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
            />
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            Téléphone de contact
            <input
              type="tel"
              value={toInputValue(values.contactPhone)}
              onChange={(e) => onChange("contactPhone", e.target.value)}
              className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-slate-200 font-medium text-sm mb-2">Images</legend>
        <div className="grid grid-cols-1 gap-3">
          <label className="text-xs text-slate-400 space-y-1">
            URL image principale
            <input
              type="text"
              value={toInputValue(values.imageUrl)}
              onChange={(e) => onChange("imageUrl", e.target.value)}
              className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
            />
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            URL image dossier
            <input
              type="text"
              value={toInputValue(values.imageDossierUrl)}
              onChange={(e) => onChange("imageDossierUrl", e.target.value)}
              className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
            />
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            URL RIB
            <input
              type="text"
              value={toInputValue(values.imageRibUrl)}
              onChange={(e) => onChange("imageRibUrl", e.target.value)}
              className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
            />
          </label>
        </div>
      </fieldset>
    </div>
  );
}
