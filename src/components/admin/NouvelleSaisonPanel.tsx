import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { EDITION_EN_PREPARATION_QUERY_KEY } from "../../hooks/useEditionEnPreparation";
import { exportTaDump, createEditionEnPreparation } from "../../api/inscription";

type EtapeDump = "idle" | "dumping" | "dump-ok" | "dump-error";

function declencherTelechargement(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Cycle annuel de l'édition (docs/specs/title-cycle-annuel-de-ldition-dump-
 * obligatoire-prparation-de.md) : dump bloquant des tables TA_* puis
 * création de l'édition suivante. Rendu par le bloc « Pilotage du tournoi »
 * dans l'étape « Tournoi en cours », tant qu'aucune édition en préparation
 * n'existe ; une fois créée, celle-ci apparaît dans sa propre carte. Le formulaire de
 * création (état `dump-ok`) reste affiché même après un échec de création
 * (l'organisateur réessaie sans refaire le dump, déjà réussi).
 */
export default function NouvelleSaisonPanel({
  token,
  editionActiveId,
}: {
  token: string;
  editionActiveId: number;
}) {
  const queryClient = useQueryClient();

  const [etapeDump, setEtapeDump] = useState<EtapeDump>("idle");
  const [erreurDump, setErreurDump] = useState<string | null>(null);

  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState("");
  const [annee, setAnnee] = useState(() => new Date().getFullYear() + 1);
  const [creation, setCreation] = useState(false);
  const [erreurCreation, setErreurCreation] = useState<string | null>(null);

  const handleDump = async () => {
    setEtapeDump("dumping");
    setErreurDump(null);
    try {
      const { blob, filename } = await exportTaDump(editionActiveId, token);
      declencherTelechargement(blob, filename);
      setEtapeDump("dump-ok");
    } catch {
      setErreurDump("Le téléchargement du dump a échoué. Réessayez avant de créer la nouvelle édition.");
      setEtapeDump("dump-error");
    }
  };

  const handleCreer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreation(true);
    setErreurCreation(null);
    try {
      await createEditionEnPreparation({ nom, categorie, annee }, token);
      // L'édition créée apparaît dans sa propre carte du bloc « Pilotage du
      // tournoi », où « Ouvrir les inscriptions » est le bouton principal.
      await queryClient.invalidateQueries({ queryKey: EDITION_EN_PREPARATION_QUERY_KEY });
    } catch {
      setErreurCreation("Impossible de créer la nouvelle édition.");
    } finally {
      setCreation(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-400">
        Sauvegarde des données du tournoi (téléchargement), puis création de l'édition suivante.
      </p>

      {etapeDump !== "dump-ok" && (
        <button
          type="button"
          onClick={() => void handleDump()}
          disabled={etapeDump === "dumping"}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-lg px-4 py-3 text-sm font-semibold text-slate-950 transition"
        >
          {etapeDump === "dumping"
            ? "Téléchargement du dump…"
            : etapeDump === "dump-error"
              ? "Réessayer le dump"
              : "Préparer la saison suivante"}
        </button>
      )}
      {erreurDump && <p className="text-sm text-red-400">{erreurDump}</p>}

      {etapeDump === "dump-ok" && (
        <form onSubmit={(e) => void handleCreer(e)} className="flex flex-col gap-3">
          <p className="text-xs text-emerald-400">
            Dump téléchargé avec succès. Créez la nouvelle édition pour continuer.
          </p>
          <label className="text-xs text-slate-400 space-y-1">
            Nom
            <input
              type="text"
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
            />
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            Catégorie
            <input
              type="text"
              required
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
            />
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            Année
            <input
              type="number"
              required
              value={annee}
              onChange={(e) => setAnnee(Number(e.target.value))}
              className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={creation}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg px-4 py-3 text-sm font-semibold text-slate-950 transition"
          >
            {creation ? "Création…" : "Créer la nouvelle édition"}
          </button>
          {erreurCreation && <p className="text-sm text-red-400">{erreurCreation}</p>}
        </form>
      )}
    </div>
  );
}
