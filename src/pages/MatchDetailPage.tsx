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

  const hasScore =
    (data.status === "ongoing" || data.status === "finished") &&
    data.scoreA !== null &&
    data.scoreB !== null;
  const winner =
    hasScore && data.scoreA !== null && data.scoreB !== null && data.scoreA !== data.scoreB
      ? data.scoreA > data.scoreB
        ? "A"
        : "B"
      : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">
        <span
          className={winner === "A" ? "text-emerald-300 font-semibold" : ""}
        >
          {data.teamA}
        </span>{" "}
        vs{" "}
        <span
          className={winner === "B" ? "text-emerald-300 font-semibold" : ""}
        >
          {data.teamB}
        </span>
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

          {hasScore && (
            <div className="text-sm">
              <span className="text-slate-400 mr-2 font-medium">Score :</span>
              <span
                data-testid="match-score"
                className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-slate-800 text-slate-100 font-semibold"
              >
                <span className={winner === "A" ? "text-emerald-300" : ""}>
                  {data.teamA}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-xs">
                  <span>{data.scoreA}</span>
                  <span className="text-slate-500">-</span>
                  <span>{data.scoreB}</span>
                </span>
                <span className={winner === "B" ? "text-emerald-300" : ""}>
                  {data.teamB}
                </span>
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
