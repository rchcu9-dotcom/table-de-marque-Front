import List from "../components/collections/List";
import type { Field } from "../components/collections/List";
import Badge from "../components/ds/Badge";
import Spinner from "../components/ds/Spinner";

import type { Match } from "../api/match";
import { useMatches } from "../hooks/useMatches";
import { useNavigate } from "react-router-dom";

export default function MatchListPage() {
  const { data, isLoading, isError } = useMatches();
  const navigate = useNavigate();

  const fields: Field<Match>[] = [
    {
      key: "teamA",
      label: "Match",
      render: (_value, item) => `${item.teamA} vs ${item.teamB}`,
    },
    {
      key: "date",
      label: "Date",
      secondary: true,
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: "status",
      label: "Statut",
      secondary: true,
      render: (value: Match["status"]) => {
        const map: Record<Match["status"], string> = {
          planned: "Prévu",
          ongoing: "En cours",
          finished: "Terminé",
          deleted: "Supprimé",
        };
        return <Badge color="accent">{map[value]}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Liste des matchs</h1>

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-300 text-sm">
          <Spinner />
          <span>Chargement…</span>
        </div>
      )}

      {isError && (
        <div className="text-red-400 text-sm">Erreur de chargement.</div>
      )}

      {data && data.length === 0 && (
        <div className="text-slate-400 text-sm">Aucun match.</div>
      )}

      {data && data.length > 0 && (
        <List
          items={data}
          fields={fields}
          onItemClick={(m) => navigate(`/matches/${m.id}`)}
        />
      )}
    </div>
  );
}
