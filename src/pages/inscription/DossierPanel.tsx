import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import {
  fetchMonDossier,
  fetchDossierParCandidature,
  ajouterJoueur,
  modifierJoueur,
  supprimerJoueur,
  ajouterCoach,
  modifierCoach,
  supprimerCoach,
  accepterDroitsImage,
  ajouterJoueurCandidature,
  modifierJoueurCandidature,
  supprimerJoueurCandidature,
  ajouterCoachCandidature,
  modifierCoachCandidature,
  supprimerCoachCandidature,
  accepterDroitsImageCandidature,
  type JoueurDossierInput,
  type CoachDossierInput,
} from '../../api/inscription';
import type {
  DossierComplet,
  JoueurDossier,
  CoachDossier,
} from '../../api/types/inscription.types';
import { useInscriptionSession } from '../../hooks/useInscriptionSession';
import { POSTES_JOUEUR, type PosteJoueur } from '../../utils/posteJoueur';
import { JoueursTable } from './JoueursTable';

/**
 * Dossier affiché : celui du référent connecté, ou celui d'une candidature
 * désignée par l'organisateur. Seuls les appels API changent, le rendu est
 * commun.
 */
export type DossierSource = { type: 'moi' } | { type: 'candidature'; id: number };

const SOURCE_MOI: DossierSource = { type: 'moi' };

function dossierApi(source: DossierSource, token: string) {
  if (source.type === 'moi') {
    return {
      charger: () => fetchMonDossier(token),
      ajouterJoueur: (d: JoueurDossierInput) => ajouterJoueur(d, token),
      modifierJoueur: (id: number, d: JoueurDossierInput) => modifierJoueur(id, d, token),
      supprimerJoueur: (id: number) => supprimerJoueur(id, token),
      ajouterCoach: (d: CoachDossierInput) => ajouterCoach(d, token),
      modifierCoach: (id: number, d: CoachDossierInput) => modifierCoach(id, d, token),
      supprimerCoach: (id: number) => supprimerCoach(id, token),
      droitsImage: (accepte: boolean) => accepterDroitsImage(accepte, token),
    };
  }
  const c = source.id;
  return {
    charger: () => fetchDossierParCandidature(c, token),
    ajouterJoueur: (d: JoueurDossierInput) => ajouterJoueurCandidature(c, d, token),
    modifierJoueur: (id: number, d: JoueurDossierInput) => modifierJoueurCandidature(c, id, d, token),
    supprimerJoueur: (id: number) => supprimerJoueurCandidature(c, id, token),
    ajouterCoach: (d: CoachDossierInput) => ajouterCoachCandidature(c, d, token),
    modifierCoach: (id: number, d: CoachDossierInput) => modifierCoachCandidature(c, id, d, token),
    supprimerCoach: (id: number) => supprimerCoachCandidature(c, id, token),
    droitsImage: (accepte: boolean) => accepterDroitsImageCandidature(c, accepte, token),
  };
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-900/40 border border-red-500/60 text-red-200 rounded p-3 my-2 text-sm">
      {message}
    </div>
  );
}

interface DossierPanelProps {
  token: string;
  readOnly: boolean;
  onClose: () => void;
  /** Par défaut : le dossier du référent connecté. */
  source?: DossierSource;
  /** Titre remplaçant « Mon dossier… » (vue organisateur). */
  titre?: string;
  /** Contenu affiché sous le titre (bandeau de contexte organisateur). */
  bandeau?: ReactNode;
  /** Appelé après chaque écriture réussie (le statut a pu changer). */
  onChange?: () => void;
}

interface JoueurFormState {
  nom: string;
  prenom: string;
  numero: string;
  poste: string;
  licenceFFH: string;
  anneeNaissance: string;
  particularitesAlim: string;
}

const JOUEUR_FORM_VIDE: JoueurFormState = {
  nom: '',
  prenom: '',
  numero: '',
  poste: '',
  licenceFFH: '',
  anneeNaissance: '',
  particularitesAlim: '',
};

interface CoachFormState {
  nom: string;
  prenom: string;
  presenceRepas: boolean;
}

const COACH_FORM_VIDE: CoachFormState = {
  nom: '',
  prenom: '',
  presenceRepas: false,
};

export default function DossierPanel({
  token,
  readOnly,
  onClose,
  source = SOURCE_MOI,
  titre,
  bandeau,
  onChange,
}: DossierPanelProps) {
  const { edition } = useInscriptionSession();
  const anneesAge = edition?.anneesAge ?? [];

  const [data, setData] = useState<DossierComplet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [joueurForm, setJoueurForm] = useState<JoueurFormState>(JOUEUR_FORM_VIDE);
  const [editingJoueurId, setEditingJoueurId] = useState<number | null>(null);

  const [coachForm, setCoachForm] = useState<CoachFormState>(COACH_FORM_VIDE);
  const [editingCoachId, setEditingCoachId] = useState<number | null>(null);
  const [suppressionCoachId, setSuppressionCoachId] = useState<number | null>(null);
  const joueurNomRef = useRef<HTMLInputElement>(null);

  const candidatureId = source.type === 'candidature' ? source.id : null;
  const api = useMemo(
    () => dossierApi(candidatureId === null ? SOURCE_MOI : { type: 'candidature', id: candidatureId }, token),
    [candidatureId, token],
  );

  // Rechargement silencieux après une action : le tableau des joueurs (et sa
  // recherche/son tri) reste monté au lieu d'être remplacé par le spinner.
  const load = useCallback(async (silencieux = false) => {
    if (!silencieux) setLoading(true);
    setError(null);
    try {
      const dossier = await api.charger();
      setData(dossier);
    } catch {
      setError('Impossible de charger le dossier.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      await load(true);
      onChange?.();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : 'Erreur lors de l\'action. Réessaie.';
      setActionError(msg);
    }
  }

  function startEditJoueur(joueur: JoueurDossier) {
    setEditingJoueurId(joueur.id);
    setJoueurForm({
      nom: joueur.nom,
      prenom: joueur.prenom,
      numero: String(joueur.numero),
      poste: joueur.poste,
      licenceFFH: joueur.licenceFFH ?? '',
      anneeNaissance: joueur.anneeNaissance ? String(joueur.anneeNaissance) : '',
      particularitesAlim: joueur.particularitesAlim ?? '',
    });
    // Le formulaire est sous le tableau : on l'amène à l'écran et on y place
    // le focus pour que « Modifier » ait un effet visible (y compris au clavier).
    requestAnimationFrame(() => {
      joueurNomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      joueurNomRef.current?.focus();
    });
  }

  function resetJoueurForm() {
    setEditingJoueurId(null);
    setJoueurForm(JOUEUR_FORM_VIDE);
  }

  async function handleSubmitJoueur(e: React.FormEvent) {
    e.preventDefault();
    if (
      !joueurForm.nom.trim() ||
      !joueurForm.prenom.trim() ||
      !joueurForm.numero ||
      !joueurForm.poste.trim() ||
      !joueurForm.anneeNaissance.trim()
    ) {
      setActionError("Nom, prénom, numéro, poste et année d'âge sont obligatoires.");
      return;
    }
    const payload = {
      nom: joueurForm.nom.trim(),
      prenom: joueurForm.prenom.trim(),
      numero: Number(joueurForm.numero),
      poste: joueurForm.poste.trim() as PosteJoueur,
      licenceFFH: joueurForm.licenceFFH.trim() || null,
      anneeNaissance: Number(joueurForm.anneeNaissance),
      particularitesAlim: joueurForm.particularitesAlim.trim() || null,
    };
    await runAction(async () => {
      if (editingJoueurId) {
        await api.modifierJoueur(editingJoueurId, payload);
      } else {
        await api.ajouterJoueur(payload);
      }
      resetJoueurForm();
    });
  }

  function startEditCoach(coach: CoachDossier) {
    setEditingCoachId(coach.id);
    setCoachForm({
      nom: coach.nom,
      prenom: coach.prenom,
      presenceRepas: coach.presenceRepas,
    });
  }

  function resetCoachForm() {
    setEditingCoachId(null);
    setCoachForm(COACH_FORM_VIDE);
  }

  async function handleSubmitCoach(e: React.FormEvent) {
    e.preventDefault();
    if (!coachForm.nom.trim() || !coachForm.prenom.trim()) {
      setActionError('Nom et prénom du coach sont obligatoires.');
      return;
    }
    const payload = {
      nom: coachForm.nom.trim(),
      prenom: coachForm.prenom.trim(),
      presenceRepas: coachForm.presenceRepas,
    };
    await runAction(async () => {
      if (editingCoachId) {
        await api.modifierCoach(editingCoachId, payload);
      } else {
        await api.ajouterCoach(payload);
      }
      resetCoachForm();
    });
  }

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <p className="text-sm text-slate-400">Chargement du dossier...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <ErrorBanner message={error ?? 'Dossier introuvable.'} />
      </div>
    );
  }

  const droitsImageAcceptes = data.dossier?.droitsImageAcceptes ?? false;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-100">
          {titre ?? (readOnly ? 'Mon dossier (validé)' : 'Mon dossier joueurs & coachs')}
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-200 transition"
        >
          Fermer
        </button>
      </div>

      {bandeau}

      {readOnly && source.type === 'moi' && (
        <p className="text-xs text-emerald-300">
          Ce dossier a été validé par l'organisateur et n'est plus modifiable.
        </p>
      )}

      {actionError && <ErrorBanner message={actionError} />}

      {/* Joueurs */}
      <section className="space-y-3">
        <JoueursTable
          joueurs={data.joueurs}
          readOnly={readOnly}
          onEdit={startEditJoueur}
          onDelete={(j) => void runAction(() => api.supprimerJoueur(j.id))}
        />

        {!readOnly && (
          <form onSubmit={(e) => void handleSubmitJoueur(e)} className="grid grid-cols-2 gap-2 bg-slate-900/40 rounded p-3">
            {editingJoueurId && (
              <p className="col-span-2 text-xs text-blue-300">
                Modification de {joueurForm.prenom} {joueurForm.nom}
              </p>
            )}
            <input
              ref={joueurNomRef}
              className="col-span-1 border border-slate-600 rounded px-2 py-1 text-sm bg-slate-700 text-slate-100 placeholder-slate-400"
              placeholder="Nom"
              value={joueurForm.nom}
              onChange={(e) => setJoueurForm((f) => ({ ...f, nom: e.target.value }))}
            />
            <input
              className="col-span-1 border border-slate-600 rounded px-2 py-1 text-sm bg-slate-700 text-slate-100 placeholder-slate-400"
              placeholder="Prénom"
              value={joueurForm.prenom}
              onChange={(e) => setJoueurForm((f) => ({ ...f, prenom: e.target.value }))}
            />
            <input
              type="number"
              className="border border-slate-600 rounded px-2 py-1 text-sm bg-slate-700 text-slate-100 placeholder-slate-400"
              placeholder="Numéro"
              value={joueurForm.numero}
              onChange={(e) => setJoueurForm((f) => ({ ...f, numero: e.target.value }))}
            />
            <fieldset className="col-span-1 flex items-center gap-3 border border-slate-600 rounded px-2 py-1">
              <legend className="sr-only">Poste</legend>
              {POSTES_JOUEUR.map((poste) => (
                <label key={poste} className="flex items-center gap-1 text-sm text-slate-100">
                  <input
                    type="radio"
                    name="poste"
                    value={poste}
                    checked={joueurForm.poste === poste}
                    onChange={() => setJoueurForm((f) => ({ ...f, poste }))}
                    className="accent-blue-500"
                  />
                  {poste}
                </label>
              ))}
            </fieldset>
            <input
              className="border border-slate-600 rounded px-2 py-1 text-sm bg-slate-700 text-slate-100 placeholder-slate-400"
              placeholder="Licence FFH (optionnel)"
              value={joueurForm.licenceFFH}
              onChange={(e) => setJoueurForm((f) => ({ ...f, licenceFFH: e.target.value }))}
            />
            {/*
              Pas d'attribut HTML `required` : la validation native
              bloquerait silencieusement l'événement submit (et donc tout
              handleSubmitJoueur, y compris les vérifications nom/prénom/
              numéro/poste) sans jamais afficher le message d'erreur thématisé
              utilisé par le reste du formulaire. La contrainte "obligatoire"
              est donc portée uniquement par handleSubmitJoueur, comme pour
              les autres champs.
            */}
            <select
              className="border border-slate-600 rounded px-2 py-1 text-sm bg-slate-700 text-slate-100"
              value={joueurForm.anneeNaissance}
              onChange={(e) => setJoueurForm((f) => ({ ...f, anneeNaissance: e.target.value }))}
            >
              <option value="" disabled>
                Année d'âge…
              </option>
              {anneesAge.map((annee) => (
                <option key={annee} value={annee}>
                  {annee}
                </option>
              ))}
            </select>
            {anneesAge.length === 0 && (
              <p className="col-span-2 text-xs text-amber-300">
                Aucune année d'âge configurée par l'organisateur : contactez-le avant de pouvoir
                ajouter un joueur.
              </p>
            )}
            <input
              className="col-span-2 border border-slate-600 rounded px-2 py-1 text-sm bg-slate-700 text-slate-100 placeholder-slate-400"
              placeholder="Particularités alimentaires (optionnel)"
              value={joueurForm.particularitesAlim}
              onChange={(e) => setJoueurForm((f) => ({ ...f, particularitesAlim: e.target.value }))}
            />
            <div className="col-span-2 flex gap-2 justify-end">
              {editingJoueurId && (
                <button
                  type="button"
                  onClick={resetJoueurForm}
                  className="px-3 py-1.5 rounded border border-slate-600 text-xs text-slate-200 hover:bg-slate-700 transition"
                >
                  Annuler
                </button>
              )}
              <button
                type="submit"
                disabled={anneesAge.length === 0}
                className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingJoueurId ? 'Enregistrer' : 'Ajouter le joueur'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Coachs */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium text-slate-200">Coachs ({data.coachs.length})</h4>
        {data.coachs.length > 0 && (
          <ul className="space-y-2">
            {data.coachs.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-sm"
              >
                <span className="text-slate-200">
                  {c.prenom} {c.nom}{c.presenceRepas ? ' — présent au repas' : ''}
                </span>
                {!readOnly && suppressionCoachId === c.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSuppressionCoachId(null);
                        void runAction(() => api.supprimerCoach(c.id));
                      }}
                      className="text-xs text-red-400 hover:text-red-300 hover:underline transition"
                    >
                      Confirmer la suppression
                    </button>
                    <button
                      onClick={() => setSuppressionCoachId(null)}
                      className="text-xs text-slate-400 hover:underline transition"
                    >
                      Annuler
                    </button>
                  </div>
                )}
                {!readOnly && suppressionCoachId !== c.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditCoach(c)}
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => setSuppressionCoachId(c.id)}
                      className="text-xs text-red-400 hover:text-red-300 hover:underline transition"
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {!readOnly && (
          <form onSubmit={(e) => void handleSubmitCoach(e)} className="grid grid-cols-2 gap-2 bg-slate-900/40 rounded p-3">
            <input
              className="border border-slate-600 rounded px-2 py-1 text-sm bg-slate-700 text-slate-100 placeholder-slate-400"
              placeholder="Nom"
              value={coachForm.nom}
              onChange={(e) => setCoachForm((f) => ({ ...f, nom: e.target.value }))}
            />
            <input
              className="border border-slate-600 rounded px-2 py-1 text-sm bg-slate-700 text-slate-100 placeholder-slate-400"
              placeholder="Prénom"
              value={coachForm.prenom}
              onChange={(e) => setCoachForm((f) => ({ ...f, prenom: e.target.value }))}
            />
            <label className="col-span-2 flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={coachForm.presenceRepas}
                onChange={(e) => setCoachForm((f) => ({ ...f, presenceRepas: e.target.checked }))}
              />
              Présent au repas
            </label>
            <div className="col-span-2 flex gap-2 justify-end">
              {editingCoachId && (
                <button
                  type="button"
                  onClick={resetCoachForm}
                  className="px-3 py-1.5 rounded border border-slate-600 text-xs text-slate-200 hover:bg-slate-700 transition"
                >
                  Annuler
                </button>
              )}
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition"
              >
                {editingCoachId ? 'Enregistrer' : 'Ajouter le coach'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Droits à l'image */}
      <section className="space-y-2">
        <h4 className="text-sm font-medium text-slate-200">Droits à l'image</h4>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={droitsImageAcceptes}
            disabled={readOnly}
            onChange={(e) =>
              void runAction(() => api.droitsImage(e.target.checked))
            }
          />
          {source.type === 'moi'
            ? "J'accepte que des photos/vidéos de mon équipe soient utilisées par l'organisation du tournoi."
            : "Le référent accepte que des photos/vidéos de son équipe soient utilisées par l'organisation du tournoi."}
        </label>
      </section>
    </div>
  );
}
