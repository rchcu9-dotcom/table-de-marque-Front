import { useParams } from "react-router-dom";
import { useMatch } from "../hooks/useMatches";
import Spinner from "../components/ds/Spinner";
import Card from "../components/ds/Card";
import Badge from "../components/ds/Badge";

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useMatch(id);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-300 text-sm">
        <Spinner />
        <span>Chargement du match…</span>
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-red-400">Match introuvable.</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">
        {data.teamA} vs {data.teamB}
      </h1>

      <Card>
        <div className="space-y-2">
          <div className="text-sm">
            <span className="text-slate-400 mr-2 font-medium">Date :</span>
            {new Date(data.date).toLocaleString()}
          </div>

          <div className="text-sm">
            <span className="text-slate-400 mr-2 font-medium">Statut :</span>
            <Badge color="accent">{data.status}</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
