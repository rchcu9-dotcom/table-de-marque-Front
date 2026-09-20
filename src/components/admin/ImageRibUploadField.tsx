import { useRef, useState } from "react";
import { buildImageRibSrc } from "../../api/inscription";
import { useUploadImageRib, useDeleteImageRib } from "../../hooks/useImageRib";

const ACCEPTED_MIME_TYPES = "image/png,image/jpeg,image/webp";

type Props = {
  editionId: number;
  token: string;
  hasImageRib: boolean;
  imageRibUpdatedAt?: string;
  imageRibUrlFallback: string | null;
};

export default function ImageRibUploadField({
  editionId,
  token,
  hasImageRib,
  imageRibUpdatedAt,
  imageRibUrlFallback,
}: Props) {
  const uploadImageRib = useUploadImageRib(editionId, token);
  const deleteImageRib = useDeleteImageRib(editionId, token);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    uploadImageRib.mutate(file, {
      onError: () => setError("Échec de l'envoi de l'image. Réessaie."),
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDelete() {
    setError(null);
    deleteImageRib.mutate(undefined, {
      onError: () => setError("Échec de la suppression de l'image. Réessaie."),
    });
  }

  const busy = uploadImageRib.isPending || deleteImageRib.isPending;

  return (
    <fieldset className="text-xs text-slate-400 space-y-2">
      <legend className="text-slate-200 font-medium text-sm mb-2">
        Image du RIB (paiement par chèque)
      </legend>
      {hasImageRib ? (
        <div className="space-y-2">
          <img
            src={buildImageRibSrc(editionId, imageRibUpdatedAt)}
            alt="Aperçu du RIB"
            className="max-w-xs rounded border border-slate-600"
          />
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="px-2 py-1 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-500 transition disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>
      ) : (
        imageRibUrlFallback && (
          <p className="text-slate-500">
            URL RIB existante (non migrée) :{" "}
            <a
              href={imageRibUrlFallback}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 hover:underline transition"
            >
              {imageRibUrlFallback}
            </a>
          </p>
        )
      )}

      <label className="space-y-1 block">
        {hasImageRib ? "Remplacer l'image" : "Choisir une image"}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME_TYPES}
          onChange={handleFileChange}
          disabled={busy}
          className="w-full text-slate-300 text-sm block"
        />
      </label>

      {error && <p className="text-red-400">{error}</p>}
    </fieldset>
  );
}
