import { useState } from 'react';

export const COMMENTAIRE_MAX_LENGTH = 2000;

interface CommentaireOrganisateurProps {
  candidatureId: number;
  /** Valeur enregistrée côté serveur. */
  commentaire: string | null;
  onSave: (candidatureId: number, commentaire: string) => void;
}

/** Note libre de l'organisateur sur une équipe — jamais affichée au responsable. */
export function CommentaireOrganisateur({
  candidatureId,
  commentaire,
  onSave,
}: CommentaireOrganisateurProps) {
  const enregistre = commentaire ?? '';
  const [brouillon, setBrouillon] = useState(enregistre);
  const id = `commentaire-organisateur-${candidatureId}`;
  const modifie = brouillon.trim() !== enregistre.trim();

  return (
    <div className="mt-3 border-t border-slate-700 pt-3 space-y-2">
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-slate-400 uppercase tracking-wide"
      >
        Commentaire organisateur
      </label>
      <textarea
        id={id}
        rows={2}
        maxLength={COMMENTAIRE_MAX_LENGTH}
        placeholder="Note interne, visible uniquement par les organisateurs"
        className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={brouillon}
        onChange={(e) => setBrouillon(e.target.value)}
      />
      {modifie && (
        <button
          type="button"
          onClick={() => onSave(candidatureId, brouillon)}
          className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition"
        >
          Enregistrer le commentaire
        </button>
      )}
    </div>
  );
}
