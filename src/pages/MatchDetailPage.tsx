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
import { useClassement } from "../hooks/useClassement";

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useMatch(id);
  const { data: allMatches } = useMatches();
  const classementKey = React.useMemo(
    () => (data?.pouleCode || data?.pouleName || "").trim(),
    [data],
  );
  const {
    data: classement,
    isLoading: isClassementLoading,
    isError: isClassementError,
  } = useClassement(classementKey);

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
    planned: "A venir",
    ongoing: "En cours",
    finished: "Terminé",
    deleted: "Supprime",
  };
  const statusColors: Record<typeof data.status, "success" | "muted" | "warning" | "default" | "info"> =
    {
      planned: "muted",
      ongoing: "warning",
      finished: "info",
      deleted: "muted",
    };

  return (
    <div className="space-y-4">
      <div className="sticky top-16 md:top-24 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800 py-3">
        <div className="flex items-center justify-center gap-6">
          <button
            className="transition hover:-translate-y-0.5"
            onClick={() => navigate(`/teams/${data.teamA}`)}
          >
            <HexBadge name={data.teamA} imageUrl={data.teamALogo ?? undefined} size={64} />
        </button>
        <div className="flex flex-col items-center text-center">
          <div className="text-xs uppercase text-slate-500">Match</div>
          <div className="text-2xl font-semibold">
            <button
              className={`hover:underline transition ${winner === "A" ? "text-emerald-300 font-semibold" : ""}`}
              onClick={() => navigate(`/teams/${data.teamA}`)}
            >
              {data.teamA}
            </button>{" "}
            vs{" "}
            <button
              className={`hover:underline transition ${winner === "B" ? "text-emerald-300 font-semibold" : ""}`}
              onClick={() => navigate(`/teams/${data.teamB}`)}
            >
              {data.teamB}
            </button>
          </div>
        </div>
        <button
          className="transition hover:-translate-y-0.5"
          onClick={() => navigate(`/teams/${data.teamB}`)}
          >
            <HexBadge name={data.teamB} imageUrl={data.teamBLogo ?? undefined} size={64} />
          </button>
        </div>
      </div>

      <Card className={data.status === "ongoing" ? "live-pulse-card" : ""}>
        <div className="relative overflow-hidden space-y-3 text-sm text-slate-200 flex flex-col items-center text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute inset-y-0 left-0 w-1/3 opacity-15"
              style={{
                backgroundImage: data.teamALogo ? `url(${data.teamALogo})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                maskImage: "linear-gradient(90deg, rgba(0,0,0,0.75), rgba(0,0,0,0))",
                WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0.75), rgba(0,0,0,0))",
                transform: "skewX(-10deg)",
                transformOrigin: "left",
              }}
            />
            <div
              className="absolute inset-y-0 right-0 w-1/3 opacity-15"
              style={{
                backgroundImage: data.teamBLogo ? `url(${data.teamBLogo})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                maskImage: "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.75))",
                WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.75))",
                transform: "skewX(-10deg)",
                transformOrigin: "right",
              }}
            />
          </div>
          <div className="text-base">{new Date(data.date).toLocaleString()}</div>
          {(data.pouleName || data.pouleCode) && (
            <div className="text-xs text-slate-400">
              Poule {data.pouleName || data.pouleCode}
            </div>
          )}

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
          <div className="text-base font-semibold text-slate-100">
            Classement {classement?.pouleName ? `- ${classement.pouleName}` : ""}
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
                  render: (_value, item) => {
                    const target = (item as { id?: string }).id ?? item.name;
                    return (
                      <button
                        onClick={() => navigate(`/teams/${target}`)}
                        className="flex items-center gap-3 hover:underline transition text-left"
                      >
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
                      </button>
                    );
                  },
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
              <div className="text-base font-semibold text-slate-100">
                Matchs de la poule {pouleMatches[0]?.pouleName || pouleMatches[0]?.pouleCode || ""}
              </div>
              <div className="text-xs text-slate-500">Glissez horizontalement</div>
            </div>

            <HorizontalMatchSlider
              matches={pouleMatches}
              currentMatchId={data.id}
              onSelect={(targetId) => navigate(`/matches/${targetId}`)}
              withDiagonalBg
            />
          </div>
        </Card>
      )}
    </div>
  );
}
