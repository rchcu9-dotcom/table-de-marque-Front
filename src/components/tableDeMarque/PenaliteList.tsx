import { useSupprimerPenalite } from "../../hooks/useMatchLive";
import type { MatchPenaliteActive } from "../../api/tableDeMarque";

type Props = {
  numMatch: number;
  penalites: MatchPenaliteActive[];
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

export default function PenaliteList({
  numMatch,
  penalites,
  equipe1Id,
  equipe1Nom,
  equipe2Id,
  equipe2Nom,
  canDelete,
  token,
}: Props) {
  const { mutate: supprimer, isPending } = useSupprimerPenalite(numMatch);

  if (penalites.length === 0) {
    return <p className="text-slate-500 text-xs italic">Aucune pénalité enregistrée</p>;
  }

  const equipeNom = (equipeId: number) =>
    equipeId === equipe1Id ? equipe1Nom : equipeId === equipe2Id ? equipe2Nom : `Equipe ${equipeId}`;

  return (
    <ul className="space-y-1">
      {penalites.map((p) => (
        <li
          key={p.id}
          className={`flex items-center justify-between text-xs rounded px-2 py-1 ${
            p.active
              ? "bg-amber-950 border border-amber-700 text-amber-200"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          <span className="font-medium">{equipeNom(p.equipeId)}</span>
          <span>{p.typePenaliteCode} {p.dureeMinutes}min</span>
          <span className="text-slate-500">{formatTime(p.tempsJeuDebut)}</span>
          {p.active && (
            <span className="text-amber-400 text-xs font-medium">Active</span>
          )}
          {canDelete && (
            <button
              onClick={() => supprimer({ id: p.id, token })}
              disabled={isPending}
              className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50 ml-2"
              title="Supprimer cette pénalité"
            >
              ✕
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
