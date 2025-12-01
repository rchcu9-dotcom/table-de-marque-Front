import { useParams } from "react-router-dom";
import { useMatch } from "../hooks/useMatches";
import Spinner from "../components/ds/Spinner";
import Card from "../components/ds/Card";
import Badge from "../components/ds/Badge";
import HexBadge from "../components/ds/HexBadge";
import DataTable from "../components/collections/DataTable";
import { useClassementForMatch } from "../hooks/useClassement";

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useMatch(id);
  const {
    data: classement,
    isLoading: isClassementLoading,
    isError: isClassementError,
  } = useClassementForMatch(id);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-300 text-sm">
        <Spinner />
        <span>Chargement du match...</span>
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

  const statusLabels: Record<typeof data.status, string> = {
    planned: "Planifie",
    ongoing: "En cours",
    finished: "Termine",
    deleted: "Supprime",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-6">
        <HexBadge name={data.teamA} imageUrl={data.teamALogo ?? undefined} size={64} />
        <div className="flex flex-col items-center text-center">
          <div className="text-xs uppercase text-slate-500">Match</div>
          <div className="text-2xl font-semibold">
            <span className={winner === "A" ? "text-emerald-300 font-semibold" : ""}>
              {data.teamA}
            </span>{" "}
            vs{" "}
            <span className={winner === "B" ? "text-emerald-300 font-semibold" : ""}>
              {data.teamB}
            </span>
          </div>
        </div>
        <HexBadge name={data.teamB} imageUrl={data.teamBLogo ?? undefined} size={64} />
      </div>

      <Card>
        <div className="space-y-3 text-sm text-slate-200 flex flex-col items-center text-center">
          <div className="text-base">{new Date(data.date).toLocaleString()}</div>

          <div className="flex items-center gap-2">
            <Badge color="accent">{statusLabels[data.status]}</Badge>
          </div>

          {hasScore && (
            <div className="text-sm">
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

      <Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold text-slate-100">
              Classement {classement ? `- ${classement.pouleName}` : ""}
            </div>
            <div className="text-xs text-slate-500">
              Actualisation auto (60s)
            </div>
          </div>

          {isClassementLoading && (
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Spinner />
              <span>Chargement du classement...</span>
            </div>
          )}

          {isClassementError && (
            <div className="text-red-400 text-sm">
              Classement indisponible.
            </div>
          )}

          {classement && (
            <DataTable
              items={classement.equipes}
              columns={[
                { key: "rang", label: "Rang" },
                {
                  key: "name",
                  label: "Equipe",
                  render: (_value, item) => (
                    <div className="flex items-center gap-2">
                      {item.logoUrl ? (
                        <img
                          src={item.logoUrl}
                          alt={item.name}
                          className="h-6 w-6 rounded-full object-cover bg-slate-800"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-slate-800" />
                      )}
                      <span>{item.name}</span>
                    </div>
                  ),
                },
                { key: "points", label: "Pts" },
                { key: "victoires", label: "V" },
                { key: "nuls", label: "N" },
                { key: "defaites", label: "D" },
                { key: "diff", label: "Diff." },
              ]}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
