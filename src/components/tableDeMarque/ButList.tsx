import { useSupprimerBut } from "../../hooks/useMatchLive";
import type { MatchBut } from "../../api/tableDeMarque";

type Props = {
  numMatch: number;
  buts: MatchBut[];
  equipe1Id: number;
  equipe1Nom: string;
  equipe2Id: number;
  equipe2Nom: string;
  canDelete: boolean;
  token: string;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}'${String(s).padStart(2, "0")}`;
}

export default function ButList({
  numMatch,
  buts,
  equipe1Id,
  equipe1Nom,
  equipe2Id,
  equipe2Nom,
  canDelete,
  token,
}: Props) {
  const { mutate: supprimer, isPending } = useSupprimerBut(numMatch);

  if (buts.length === 0) {
    return <p className="text-slate-500 text-xs italic">Aucun but enregistré</p>;
  }

  const equipeNom = (equipeId: number) =>
    equipeId === equipe1Id ? equipe1Nom : equipeId === equipe2Id ? equipe2Nom : `Equipe ${equipeId}`;

  return (
    <ul className="space-y-1">
      {buts.map((but) => (
        <li
          key={but.id}
          className="flex items-center justify-between text-xs text-slate-200 bg-slate-800 rounded px-2 py-1"
        >
          <span className="font-medium">{equipeNom(but.equipeId)}</span>
          <span className="text-slate-400">{formatTime(but.tempsJeuSecondes)}</span>
          {canDelete && (
            <button
              onClick={() => supprimer({ id: but.id, token })}
              disabled={isPending}
              className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50 ml-2"
              title="Supprimer ce but"
            >
              ✕
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
