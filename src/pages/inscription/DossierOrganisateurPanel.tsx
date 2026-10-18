import { useEffect, useRef, useState } from 'react';
import type {
  CandidatureOrganisateur,
  EditionEtape,
} from '../../api/types/inscription.types';
import DossierPanel from './DossierPanel';
import { StatutBadge } from './StatutBadge';

interface DossierOrganisateurPanelProps {
  candidature: CandidatureOrganisateur;
  etape: EditionEtape | null;
  token: string;
  onClose: () => void;
  /** Le dossier a été modifié (le statut a pu passer VALIDEE → DOSSIER_EN_COURS). */
  onChange: () => void;
  onValider: (id: number) => Promise<unknown>;
  onRouvrir: (id: number) => Promise<unknown>;
}

/**
 * Dossier d'une candidature vu par l'organisateur : panneau latéral sur
 * desktop, plein écran sur mobile. La liste reste montée derrière, ce qui
 * conserve ses filtres et sa position de défilement à la fermeture.
 *
 * Règle d'édition (backlog 2, lot B) : l'organisateur peut modifier en
 * VALIDEE, DOSSIER_EN_COURS et DOSSIER_COMPLET ; plus personne à partir de
 * TOURNOI_DEMARRE.
 */
export function DossierOrganisateurPanel({
  candidature,
  etape,
  token,
  onClose,
  onChange,
  onValider,
  onRouvrir,
}: DossierOrganisateurPanelProps) {
  const titreRef = useRef<HTMLHeadingElement>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const readOnly = etape === 'TOURNOI_DEMARRE';

  // Focus dans le panneau à l'ouverture, retour au déclencheur à la fermeture.
  useEffect(() => {
    const declencheur = document.activeElement as HTMLElement | null;
    titreRef.current?.focus();
    return () => declencheur?.focus?.();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function lancer(action: (id: number) => Promise<unknown>) {
    setActionError(null);
    setEnCours(true);
    try {
      await action(candidature.id);
    } catch (e: unknown) {
      setActionError(
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : "Erreur lors de l'action. Réessaie.",
      );
    } finally {
      setEnCours(false);
    }
  }

  const bandeau = (
    <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2">
      <StatutBadge statut={candidature.statut} />
      {candidature.statut === 'DOSSIER_COMPLET' && !readOnly && (
        <span className="text-xs text-slate-400">
          Figé pour le référent — vous pouvez encore le corriger.
        </span>
      )}
      {readOnly && (
        <span className="text-xs text-slate-400">
          Le tournoi a démarré : dossier en lecture seule.
        </span>
      )}
      <span className="flex-1" />
      {candidature.statut === 'DOSSIER_EN_COURS' && (
        <button
          type="button"
          disabled={enCours}
          onClick={() => void lancer(onValider)}
          className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 transition disabled:opacity-50"
        >
          Valider le dossier
        </button>
      )}
      {candidature.statut === 'DOSSIER_COMPLET' && (
        <button
          type="button"
          disabled={enCours}
          onClick={() => void lancer(onRouvrir)}
          className="px-3 py-1.5 rounded bg-orange-500 text-white text-xs font-medium hover:bg-orange-400 transition disabled:opacity-50"
        >
          Rouvrir le dossier
        </button>
      )}
      {actionError && (
        <p role="alert" className="w-full text-xs text-red-300">
          {actionError}
        </p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div aria-hidden="true" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-dossier-organisateur"
        className="relative h-full w-full sm:max-w-xl overflow-y-auto bg-slate-900 sm:border-l border-slate-700 shadow-xl p-4"
      >
        <h2
          id="titre-dossier-organisateur"
          ref={titreRef}
          tabIndex={-1}
          className="text-lg font-bold text-slate-100 mb-3 pr-16 truncate focus:outline-none"
        >
          Dossier — {candidature.equipeNom}
        </h2>
        <DossierPanel
          token={token}
          source={{ type: 'candidature', id: candidature.id }}
          readOnly={readOnly}
          titre="Joueurs & coachs"
          bandeau={bandeau}
          onClose={onClose}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
