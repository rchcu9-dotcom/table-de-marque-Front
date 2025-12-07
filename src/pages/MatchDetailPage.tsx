import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMatch, useMatches } from "../hooks/useMatches";
import Spinner from "../components/ds/Spinner";
import Card from "../components/ds/Card";
import Badge from "../components/ds/Badge";
import HexBadge from "../components/ds/HexBadge";
import DataTable from "../components/collections/DataTable";
import HorizontalMatchSlider from "../components/collections/HorizontalMatchSlider";
import MatchSummaryGrid from "../components/collections/MatchSummaryGrid";
import { useClassementForMatch } from "../hooks/useClassement";

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useMatch(id);
  const { data: allMatches } = useMatches();
  const {
    data: classement,
    isLoading: isClassementLoading,
    isError: isClassementError,
  } = useClassementForMatch(id);

  const pouleKey = (data?.pouleName || data?.pouleCode || "").trim().toLowerCase();
  const pouleMatches = React.useMemo(() => {
    if (!allMatches || !pouleKey) return [];
    return [...allMatches]
      .filter((m) => (m.pouleName || m.pouleCode || "").trim().toLowerCase() === pouleKey)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allMatches, pouleKey]);

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
  const statusColors: Record<typeof data.status, "success" | "muted" | "warning" | "default"> = {
    planned: "muted",
    ongoing: "warning",
    finished: "success",
    deleted: "muted",
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
            <Badge color={statusColors[data.status]}>{statusLabels[data.status]}</Badge>
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

      {pouleMatches.length > 0 && (
        <Card data-testid="summary-section">
          <div className="space-y-4">
            <div data-testid="summary-grid-teamA">
              <MatchSummaryGrid
                matches={pouleMatches.filter(
                  (m) =>
                    m.teamA.toLowerCase() === data.teamA.toLowerCase() ||
                    m.teamB.toLowerCase() === data.teamA.toLowerCase(),
                )}
                currentMatchId={data.id}
                focusTeam={data.teamA}
                onSelect={(targetId) => navigate(`/matches/${targetId}`)}
              />
            </div>

            <div data-testid="summary-grid-teamB">
              <MatchSummaryGrid
                matches={pouleMatches.filter(
                  (m) =>
                    m.teamA.toLowerCase() === data.teamB.toLowerCase() ||
                    m.teamB.toLowerCase() === data.teamB.toLowerCase(),
                )}
                currentMatchId={data.id}
                focusTeam={data.teamB}
                onSelect={(targetId) => navigate(`/matches/${targetId}`)}
              />
            </div>
          </div>
        </Card>
      )}

      <Card data-testid="classement-section">
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
                { key: "rang", label: "Pos" },
                {
                  key: "name",
                  label: "Equipe",
                  render: (_value, item) => (
                    <div className="flex items-center gap-3">
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

      {pouleMatches.length > 0 && (
        <Card data-testid="poule-slider">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-slate-100">Matchs de la poule</div>
              <div className="text-xs text-slate-500">Glissez horizontalement</div>
            </div>

            <HorizontalMatchSlider
              matches={pouleMatches}
              currentMatchId={data.id}
              onSelect={(targetId) => navigate(`/matches/${targetId}`)}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
