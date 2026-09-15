import { useState } from "react";
import { useAjouterAnneeAge, useRetirerAnneeAge } from "../../hooks/useAnneesAge";

type Props = {
  editionId: number;
  anneesAge: number[];
  token: string;
};

/**
 * Contrairement aux autres blocs de ParametresInscriptionPage, l'ajout/retrait
 * d'une année persiste immédiatement (pas de brouillon local ni de bouton
 * "Enregistrer" commun) : le formulaire dossier joueur doit voir la liste à
 * jour dès l'action de l'organisateur (spec, critère d'acceptation 1).
 */
export default function EditionAnneesAgeForm({ editionId, anneesAge, token }: Props) {
  const [nouvelleAnnee, setNouvelleAnnee] = useState("");
  const ajouter = useAjouterAnneeAge(editionId, token);
  const retirer = useRetirerAnneeAge(editionId, token);

  function handleAjouter() {
    const annee = Number(nouvelleAnnee);
    if (!nouvelleAnnee.trim() || Number.isNaN(annee)) return;
    ajouter.mutate(annee, { onSuccess: () => setNouvelleAnnee("") });
  }

  const anneesTriees = [...anneesAge].sort((a, b) => a - b);

  return (
    <fieldset className="space-y-3">
      <legend className="text-slate-200 font-medium text-sm mb-2">Années d'âge</legend>

      {anneesTriees.length === 0 && (
        <p className="text-amber-300 text-xs bg-amber-900/30 border border-amber-700 rounded px-2 py-1">
          Aucune année configurée : le formulaire dossier joueur sera bloqué pour les équipes
          tant qu'aucune année n'est ajoutée ici.
        </p>
      )}

      <ul className="flex flex-wrap gap-2">
        {anneesTriees.map((annee) => (
          <li
            key={annee}
            className="flex items-center gap-1 bg-slate-800 border border-slate-600 rounded-full px-3 py-1 text-sm text-slate-100"
          >
            {annee}
            <button
              type="button"
              onClick={() => retirer.mutate(annee)}
              disabled={retirer.isPending}
              aria-label={`Retirer l'année ${annee}`}
              className="text-slate-400 hover:text-red-400"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {/*
        Pas de <form> imbriqué ici : ce bloc est monté à l'intérieur du
        <form> global de ParametresInscriptionPage, et un <form> imbriqué est
        invalide en HTML (le navigateur ferme le <form> parent prématurément,
        ce qui a provoqué un déclenchement croisé du submit global lors d'un
        clic sur "Ajouter"). Le clic + la touche Entrée sont donc gérés
        manuellement plutôt que via onSubmit.
      */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={nouvelleAnnee}
          onChange={(e) => setNouvelleAnnee(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAjouter();
            }
          }}
          placeholder="Ex: 2015"
          className="w-28 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
        />
        <button
          type="button"
          onClick={handleAjouter}
          disabled={ajouter.isPending}
          className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm"
        >
          Ajouter
        </button>
      </div>
      {(ajouter.isError || retirer.isError) && (
        <p className="text-red-400 text-xs">
          Impossible de mettre à jour les années d'âge. Réessaie.
        </p>
      )}
    </fieldset>
  );
}
