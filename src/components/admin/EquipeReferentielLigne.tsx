import type { EquipeRef } from "../../api/types/inscription.types";
import { EquipeNoms } from "../../pages/inscription/EquipeNoms";

interface EquipeReferentielLigneProps {
  equipe: EquipeRef;
  /** Une mutation est en cours : les actions sont suspendues. */
  occupe: boolean;
  onModifier: () => void;
  onActiver: () => void;
  onDemanderDesactivation: () => void;
}

/** Une équipe du référentiel en lecture, avec ses actions. */
export default function EquipeReferentielLigne({
  equipe,
  occupe,
  onModifier,
  onActiver,
  onDemanderDesactivation,
}: EquipeReferentielLigneProps) {
  const nbCandidatures = equipe.nbCandidatures ?? 0;

  return (
    // Sur mobile, les actions passent sous les noms pour leur laisser toute la largeur.
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex-1 min-w-0 flex items-center gap-3">
        {equipe.logoUrl && (
          <img
            src={equipe.logoUrl}
            alt=""
            className="w-8 h-8 object-contain rounded-full shrink-0"
          />
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <EquipeNoms
            nom={equipe.nom}
            nomComplet={equipe.nomComplet}
            className="text-sm font-semibold text-slate-100 min-w-0 max-w-full [&>span]:truncate"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ${
                equipe.active
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-slate-700 text-slate-300"
              }`}
            >
              {equipe.active ? "Active" : "Désactivée"}
            </span>
            {nbCandidatures > 0 && (
              <span className="text-slate-400">
                {nbCandidatures} candidature{nbCandidatures > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={onModifier}
          disabled={occupe}
          aria-label={`Modifier ${equipe.nom}`}
          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition"
        >
          Modifier
        </button>
        {equipe.active ? (
          <button
            type="button"
            onClick={onDemanderDesactivation}
            disabled={occupe}
            aria-label={`Désactiver ${equipe.nom}`}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-300 transition"
          >
            Désactiver
          </button>
        ) : (
          <button
            type="button"
            onClick={onActiver}
            disabled={occupe}
            aria-label={`Activer ${equipe.nom}`}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-950 transition"
          >
            Activer
          </button>
        )}
      </div>
    </div>
  );
}
