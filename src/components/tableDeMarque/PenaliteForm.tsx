import { useState } from "react";
import { useAjouterPenalite } from "../../hooks/useMatchLive";
import type { JoueurInfo } from "../../api/tableDeMarque";

const TYPE_PENALITES = [
  { code: "mineure", libelle: "Mineure", dureeMinutes: 2 },
  { code: "majeure", libelle: "Majeure", dureeMinutes: 5 },
  { code: "meconduite", libelle: "Méconduite", dureeMinutes: 10 },
];

type Props = {
  numMatch: number;
  equipeId: number;
  equipeNom: string;
  joueurs: JoueurInfo[];
  tempsActuel: number;
  token: string;
};

export default function PenaliteForm({
  numMatch,
  equipeId,
  equipeNom,
  joueurs,
  tempsActuel,
  token,
}: Props) {
  const [joueurId, setJoueurId] = useState<string>("");
  const [typeCode, setTypeCode] = useState<string>(TYPE_PENALITES[0].code);
  const { mutate, isPending } = useAjouterPenalite(numMatch);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joueurId) return;
    const type = TYPE_PENALITES.find((t) => t.code === typeCode) ?? TYPE_PENALITES[0];
    mutate({
      payload: {
        equipeId,
        joueurId: parseInt(joueurId, 10),
        typePenaliteCode: type.code,
        dureeMinutes: type.dureeMinutes,
        tempsJeuDebut: tempsActuel,
      },
      token,
    });
    setJoueurId("");
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
          value={joueurId}
          onChange={(e) => setJoueurId(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-xs"
          required
        >
          <option value="">Joueur…</option>
          {joueurs.map((j) => (
            <option key={j.id} value={j.id}>
              #{j.numero} {j.prenom} {j.nom}
            </option>
          ))}
        </select>
        <select
          value={typeCode}
          onChange={(e) => setTypeCode(e.target.value)}
          className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-xs"
        >
          {TYPE_PENALITES.map((t) => (
            <option key={t.code} value={t.code}>
              {t.libelle} ({t.dureeMinutes} min)
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending || !joueurId}
          className="px-3 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white text-xs font-medium disabled:opacity-50"
        >
          + Pénalité
        </button>
      </div>
    </form>
  );
}
