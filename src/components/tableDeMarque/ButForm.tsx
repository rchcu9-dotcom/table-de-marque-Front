import { useState } from "react";
import { useAjouterBut } from "../../hooks/useMatchLive";
import type { JoueurInfo } from "../../api/tableDeMarque";

type Props = {
  numMatch: number;
  equipeId: number;
  equipeNom: string;
  joueurs: JoueurInfo[];
  tempsActuel: number;
  token: string;
};

export default function ButForm({ numMatch, equipeId, equipeNom, joueurs, tempsActuel, token }: Props) {
  const [buteurId, setButeurId] = useState<string>("");
  const [assist1Id, setAssist1Id] = useState<string>("");
  const [assist2Id, setAssist2Id] = useState<string>("");
  const { mutate, isPending } = useAjouterBut(numMatch);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buteurId) return;
    mutate({
      payload: {
        equipeId,
        buteurId: parseInt(buteurId, 10),
        assist1Id: assist1Id ? parseInt(assist1Id, 10) : null,
        assist2Id: assist2Id ? parseInt(assist2Id, 10) : null,
        tempsJeuSecondes: tempsActuel,
      },
      token,
    });
    setButeurId("");
    setAssist1Id("");
    setAssist2Id("");
  };

  if (joueurs.length === 0) {
    return (
      <div className="text-slate-500 text-xs italic">
        Aucun joueur enregistré pour {equipeNom}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-xs font-medium text-slate-300">{equipeNom}</p>
      <div className="flex flex-wrap gap-2">
        <select
          value={buteurId}
          onChange={(e) => setButeurId(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-xs"
          required
        >
          <option value="">Buteur…</option>
          {joueurs.map((j) => (
            <option key={j.id} value={j.id}>
              #{j.numero} {j.prenom} {j.nom}
            </option>
          ))}
        </select>
        <select
          value={assist1Id}
          onChange={(e) => setAssist1Id(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-xs"
        >
          <option value="">Assist 1 (optionnel)</option>
          {joueurs.map((j) => (
            <option key={j.id} value={j.id}>
              #{j.numero} {j.prenom} {j.nom}
            </option>
          ))}
        </select>
        <select
          value={assist2Id}
          onChange={(e) => setAssist2Id(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-xs"
        >
          <option value="">Assist 2 (optionnel)</option>
          {joueurs.map((j) => (
            <option key={j.id} value={j.id}>
              #{j.numero} {j.prenom} {j.nom}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending || !buteurId}
          className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium disabled:opacity-50"
        >
          + But
        </button>
      </div>
    </form>
  );
}
