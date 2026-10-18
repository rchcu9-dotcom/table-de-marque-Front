import { useState } from 'react';
import { useCreerEquipeReferentiel } from '../../hooks/useEquipesReferentiel';
import {
  NOM_COMPLET_MAX,
  messageErreurCreationEquipe,
} from '../../pages/inscription/equipeCreationErreur';

/**
 * Ajout d'une équipe au référentiel par l'organisateur
 * (docs/specs/-prise-en-compte-du-nom-court-pour-les-logos-contexte-actuel.md) :
 * seul point de saisie du nom complet. Le nom court reste l'identifiant de
 * l'équipe et la source du nom de fichier de logo.
 */
export default function AjouterEquipeReferentielPanel({ token }: { token: string }) {
  const creer = useCreerEquipeReferentiel(token);
  const [nom, setNom] = useState('');
  const [nomComplet, setNomComplet] = useState('');
  const [equipeAjoutee, setEquipeAjoutee] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nomCourt = nom.trim();
    if (!nomCourt) return;
    setEquipeAjoutee(null);
    creer.mutate(
      { nom: nomCourt, nomComplet: nomComplet.trim() || undefined },
      {
        onSuccess: (equipe) => {
          setEquipeAjoutee(equipe.nom);
          setNom('');
          setNomComplet('');
        },
      },
    );
  }

  return (
    <div className="border-t border-slate-800 pt-4 mt-2 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
        Ajouter une équipe au référentiel
      </h2>
      <p className="text-xs text-slate-500">
        Le nom court identifie l'équipe et sert à retrouver son logo. Le nom complet est
        affiché en dessous dans la liste des équipes et pris en compte par la recherche.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label
            className="block text-sm font-medium mb-1 text-slate-200"
            htmlFor="equipe-ref-nom"
          >
            Nom court
          </label>
          <input
            id="equipe-ref-nom"
            type="text"
            className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ex: Courbevoie"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            disabled={creer.isPending}
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium mb-1 text-slate-200"
            htmlFor="equipe-ref-nom-complet"
          >
            Nom complet (optionnel)
          </label>
          <input
            id="equipe-ref-nom-complet"
            type="text"
            maxLength={NOM_COMPLET_MAX}
            className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ex: Les Coqs de Courbevoie"
            value={nomComplet}
            onChange={(e) => setNomComplet(e.target.value)}
            disabled={creer.isPending}
          />
        </div>
        {creer.isError && (
          <div
            role="alert"
            className="bg-red-900/40 border border-red-500/60 text-red-200 rounded p-3 text-sm"
          >
            {messageErreurCreationEquipe(creer.error)}
          </div>
        )}
        {equipeAjoutee && !creer.isError && (
          <p role="status" className="text-sm text-emerald-300">
            Équipe « {equipeAjoutee} » ajoutée.
          </p>
        )}
        <div>
          <button
            type="submit"
            disabled={creer.isPending || !nom.trim()}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-950 transition"
          >
            {creer.isPending ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}
