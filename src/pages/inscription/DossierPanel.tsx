import { useState, useEffect, useCallback } from 'react';
import {
  fetchMonDossier,
  ajouterJoueur,
  modifierJoueur,
  supprimerJoueur,
  ajouterCoach,
  modifierCoach,
  supprimerCoach,
  accepterDroitsImage,
} from '../../api/inscription';
import type {
  DossierComplet,
  JoueurDossier,
  CoachDossier,
} from '../../api/types/inscription.types';
import { useInscriptionSession } from '../../hooks/useInscriptionSession';
import { POSTES_JOUEUR, type PosteJoueur } from '../../utils/posteJoueur';

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

export default function DossierPanel({ token, readOnly, onClose }: DossierPanelProps) {
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dossier = await fetchMonDossier(token);
      setData(dossier);
    } catch {
      setError('Impossible de charger le dossier.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      await load();
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
        await modifierJoueur(editingJoueurId, payload, token);
      } else {
        await ajouterJoueur(payload, token);
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
        await modifierCoach(editingCoachId, payload, token);
      } else {
        await ajouterCoach(payload, token);
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
          {readOnly ? 'Mon dossier (validé)' : 'Mon dossier joueurs & coachs'}
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-200 transition"
        >
          Fermer
        </button>
      </div>

      {readOnly && (
        <p className="text-xs text-emerald-300">
          Ce dossier a été validé par l'organisateur et n'est plus modifiable.
        </p>
      )}

      {actionError && <ErrorBanner message={actionError} />}

      {/* Joueurs */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium text-slate-200">Joueurs ({data.joueurs.length})</h4>
        {data.joueurs.length > 0 && (
          <ul className="space-y-2">
            {data.joueurs.map((j) => (
              <li
                key={j.id}
                className="flex items-center justify-between bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-sm"
              >
                <span className="text-slate-200">
                  #{j.numero} — {j.prenom} {j.nom} ({j.poste})
                </span>
                {!readOnly && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditJoueur(j)}
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => void runAction(() => supprimerJoueur(j.id, token))}
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
          <form onSubmit={(e) => void handleSubmitJoueur(e)} className="grid grid-cols-2 gap-2 bg-slate-900/40 rounded p-3">
            <input
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
                {!readOnly && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditCoach(c)}
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => void runAction(() => supprimerCoach(c.id, token))}
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
              void runAction(() => accepterDroitsImage(e.target.checked, token))
            }
          />
          J'accepte que des photos/vidéos de mon équipe soient utilisées par l'organisation du tournoi.
        </label>
      </section>
    </div>
  );
}
