import type { EquipeEffectifs } from "../../api/tableDeMarque";

type Props = {
  equipe1: EquipeEffectifs;
  equipe2: EquipeEffectifs;
};

function EquipeCard({ equipe }: { equipe: EquipeEffectifs }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2 flex-1">
      <h3 className="font-semibold text-slate-100 text-sm">{equipe.nom}</h3>

      {equipe.joueurs.length === 0 && equipe.coachs.length === 0 ? (
        <p className="text-slate-500 text-xs italic">Aucun joueur enregistré</p>
      ) : (
        <>
          {equipe.joueurs.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase mb-1">Joueurs</p>
              <ul className="space-y-0.5">
                {equipe.joueurs.map((j) => (
                  <li key={j.id} className="text-xs text-slate-200 flex gap-2">
                    <span className="w-6 text-right text-slate-500">#{j.numero}</span>
                    <span>{j.prenom} {j.nom}</span>
                    <span className="text-slate-500">{j.poste}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {equipe.coachs.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase mb-1">Coachs</p>
              <ul className="space-y-0.5">
                {equipe.coachs.map((c) => (
                  <li key={c.id} className="text-xs text-slate-200">
                    {c.prenom} {c.nom}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AnnonceEffectifs({ equipe1, equipe2 }: Props) {
  return (
    <div className="flex gap-3">
      <EquipeCard equipe={equipe1} />
      <EquipeCard equipe={equipe2} />
    </div>
  );
}
