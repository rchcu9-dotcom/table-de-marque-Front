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
import type { FinalSquare, FinalSquareMatch } from "../api/classement";
import type { Match } from "../api/match";
import { useClassement, useJ3FinalSquares } from "../hooks/useClassement";
import icon5v5 from "../assets/icons/nav/fivev5.png";
import icon3v3 from "../assets/icons/nav/threev3.png";
import iconChallenge from "../assets/icons/nav/challenge.png";
import Breadcrumbs from "../components/navigation/Breadcrumbs";

const compIcon: Record<string, string> = {
  "5v5": icon5v5,
  "3v3": icon3v3,
  challenge: iconChallenge,
};

const normalizeTeamKey = (value?: string | null) => value?.trim().toLowerCase() ?? "";

function toMatchFromFinalSquareMatch(match: FinalSquareMatch, square: FinalSquare): Match {
  return {
    id: match.id,
    date: match.date,
    teamA: match.teamA.name,
    teamB: match.teamB.name,
    teamALogo: match.teamA.logoUrl,
    teamBLogo: match.teamB.logoUrl,
    status: match.status,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    competitionType: "5v5",
    surface: "GG",
    phase: "finales",
    jour: "J3",
    pouleCode: square.dbCode,
    pouleName: square.label,
  };
}

function getSquareMatches(square?: FinalSquare | null) {
  if (!square) return [];
  return [
    ...square.semiFinals,
    ...(square.finalMatch ? [square.finalMatch] : []),
    ...(square.thirdPlaceMatch ? [square.thirdPlaceMatch] : []),
  ];
}

function squareContainsTeams(square: FinalSquare, teamA: string, teamB: string) {
  const squareTeamKeys = new Set<string>();
  square.ranking.forEach((row) => {
    if (row.team?.id) squareTeamKeys.add(normalizeTeamKey(row.team.id));
    if (row.team?.name) squareTeamKeys.add(normalizeTeamKey(row.team.name));
  });
  getSquareMatches(square).forEach((match) => {
    [match.teamA, match.teamB].forEach((team) => {
      if (team.id) squareTeamKeys.add(normalizeTeamKey(team.id));
      if (team.name) squareTeamKeys.add(normalizeTeamKey(team.name));
    });
  });
  return squareTeamKeys.has(normalizeTeamKey(teamA)) && squareTeamKeys.has(normalizeTeamKey(teamB));
}

function formatSquareSuffix(label?: string | null) {
  return (label ?? "").replace(/^carr[ée]\s+/i, "").trim();
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useMatch(id);
  const { data: allMatches } = useMatches();
  const competitionType = (data?.competitionType ?? "5v5").toLowerCase();
  const isJ3FiveV5 = competitionType === "5v5" && data?.jour === "J3";
  const classementKey = React.useMemo(
    () => (isJ3FiveV5 ? "" : (data?.pouleCode || data?.pouleName || "").trim()),
    [data, isJ3FiveV5],
  );
  const {
    data: classement,
    isLoading: isClassementLoading,
    isError: isClassementError,
  } = useClassement(classementKey);
  const {
    data: j3FinalSquares,
    isLoading: isJ3SquaresLoading,
    isError: isJ3SquaresError,
  } = useJ3FinalSquares();

  const pouleKey = (data?.pouleName || data?.pouleCode || "").trim().toLowerCase();
  const pouleMatches = React.useMemo(() => {
    if (!allMatches || !pouleKey) return [];
    return [...allMatches]
      .filter((m) => (m.pouleName || m.pouleCode || "").trim().toLowerCase() === pouleKey)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allMatches, pouleKey]);
  const currentJ3Square = React.useMemo(() => {
    if (!isJ3FiveV5 || !data) return null;
    const squares = j3FinalSquares?.carres ?? [];
    if (squares.length === 0) return null;

    const byMatchId = squares.find((square) => getSquareMatches(square).some((match) => match.id === data.id));
    if (byMatchId) return byMatchId;

    return squares.find((square) => squareContainsTeams(square, data.teamA, data.teamB)) ?? null;
  }, [data, isJ3FiveV5, j3FinalSquares]);
  const relatedMatches = React.useMemo(() => {
    if (isJ3FiveV5) {
      return getSquareMatches(currentJ3Square)
        .map((match) => toMatchFromFinalSquareMatch(match, currentJ3Square!))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return pouleMatches;
  }, [currentJ3Square, isJ3FiveV5, pouleMatches]);
  const j3ClassementRows = React.useMemo(() => {
    if (!currentJ3Square) return [];
    return [...currentJ3Square.ranking]
      .sort((a, b) => a.place - b.place)
      .map((row) => ({
        rank: row.place,
        place: row.place,
        teamId: row.team?.id ?? `j3-${currentJ3Square.dbCode}-${row.place}`,
        teamName: row.team?.name ?? "En attente du résultat",
        teamLogoUrl: row.team?.logoUrl ?? null,
        isPlaceholder: !row.team,
      }));
  }, [currentJ3Square]);

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
    deleted: "Supprimé",
  };
  const statusColors: Record<typeof data.status, "success" | "muted" | "warning" | "default" | "info"> =
    {
      planned: "muted",
      ongoing: "warning",
      finished: "info",
      deleted: "muted",
    };
  const competitionIcon = compIcon[competitionType] ?? icon5v5;
  const hasClassement = competitionType === "5v5";
  const contextLabel = isJ3FiveV5 ? currentJ3Square?.label : (data.pouleName || data.pouleCode);
  const breadcrumbs = [
    { label: "Accueil", path: "/" },
    { label: "Planning", path: "/planning" },
    { label: `${data.teamA} vs ${data.teamB}` },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={breadcrumbs} />
      <div className="sticky top-16 md:top-24 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800 py-3">
        <div className="flex items-center justify-center gap-6">
          <button
            className="transition hover:-translate-y-0.5"
            onClick={() => navigate(`/teams/${data.teamA}`)}
          >
            <HexBadge name={data.teamA} imageUrl={data.teamALogo ?? undefined} size={64} />
        </button>
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 text-xs uppercase text-slate-500">
            <img src={competitionIcon} alt={data.competitionType ?? "5v5"} className="h-6 w-6 rounded-md bg-slate-800 object-cover" />
            <span>Match</span>
          </div>
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
          {contextLabel && (
            <div className="text-xs text-slate-400">
              {isJ3FiveV5 ? contextLabel : `Poule ${contextLabel}`}
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

      {relatedMatches.length > 0 && (
        <Card data-testid="summary-section">
          <div className="space-y-4">
            <div data-testid="summary-grid-teamA">
              <MatchSummaryGrid
                matches={relatedMatches.filter(
                  (m) =>
                    normalizeTeamKey(m.teamA) === normalizeTeamKey(data.teamA) ||
                    normalizeTeamKey(m.teamB) === normalizeTeamKey(data.teamA),
                )}
                currentMatchId={data.id}
                focusTeam={data.teamA}
                onSelect={(targetId) => navigate(`/matches/${targetId}`)}
              />
            </div>

            <div data-testid="summary-grid-teamB">
              <MatchSummaryGrid
                matches={relatedMatches.filter(
                  (m) =>
                    normalizeTeamKey(m.teamA) === normalizeTeamKey(data.teamB) ||
                    normalizeTeamKey(m.teamB) === normalizeTeamKey(data.teamB),
                )}
                currentMatchId={data.id}
                focusTeam={data.teamB}
                onSelect={(targetId) => navigate(`/matches/${targetId}`)}
              />
            </div>
          </div>
        </Card>
      )}

      {hasClassement && (
      <Card data-testid="classement-section">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-base font-semibold text-slate-100">
            <img src={competitionIcon} alt={data.competitionType ?? "5v5"} className="h-6 w-6 rounded-md bg-slate-800 object-cover" />
            <span>Classement</span>
          </div>
          <div className="text-sm text-slate-300">
            {isJ3FiveV5
              ? currentJ3Square?.label ?? ""
              : classement?.pouleName ? `Poule ${classement.pouleName}` : ""}
          </div>

          {isJ3FiveV5 && isJ3SquaresLoading && (
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Spinner />
              <span>Chargement du classement du carré...</span>
            </div>
          )}

          {!isJ3FiveV5 && isClassementLoading && (
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Spinner />
              <span>Chargement du classement...</span>
            </div>
          )}

          {isJ3FiveV5 && isJ3SquaresError && (
            <div className="text-red-400 text-sm">
              Classement du carré indisponible.
            </div>
          )}

          {isJ3FiveV5 && !isJ3SquaresLoading && !isJ3SquaresError && !currentJ3Square && (
            <div className="text-red-400 text-sm">
              Carré J3 introuvable pour ce match.
            </div>
          )}

          {!isJ3FiveV5 && isClassementError && (
            <div className="text-red-400 text-sm">
              Classement indisponible.
            </div>
          )}

          {isJ3FiveV5 && j3ClassementRows.length > 0 && (
            <DataTable
              items={j3ClassementRows}
              columns={[
                { key: "rank", label: "Pos" },
                { key: "place", label: "Place" },
                {
                  key: "teamName",
                  label: "Equipe",
                  render: (_value, item) =>
                    item.isPlaceholder ? (
                      <span className="text-slate-400">{item.teamName}</span>
                    ) : (
                      <button
                        onClick={() => navigate(`/teams/${item.teamId}`)}
                        className="flex items-center gap-3 hover:underline transition text-left"
                      >
                        {item.teamLogoUrl ? (
                          <img
                            src={item.teamLogoUrl}
                            alt={item.teamName}
                            className="h-6 w-6 rounded-full object-cover bg-slate-800"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-slate-800" />
                        )}
                        <span>{item.teamName}</span>
                      </button>
                    ),
                },
              ]}
            />
          )}

          {!isJ3FiveV5 && classement && (
            <DataTable
              items={classement.equipes}
              columns={[
                { key: "rang", label: "Pos" },
                {
                  key: "name",
                  label: "Equipe",
                  render: (_value, item) => {
                    const target = (item as { id?: string }).id ?? item.name;
                    const nameShort =
                      (item as { nameShort?: string }).nameShort ||
                      (item as { shortName?: string }).shortName ||
                      item.name;
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
                        <span>{nameShort}</span>
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
      )}

      {relatedMatches.length > 0 && (
        <Card data-testid="poule-slider">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-base font-semibold text-slate-100">
                <img src={competitionIcon} alt={data.competitionType ?? "5v5"} className="h-6 w-6 rounded-md bg-slate-800 object-cover" />
                <span>
                  {isJ3FiveV5
                    ? `Matchs du carré ${formatSquareSuffix(currentJ3Square?.label)}`
                    : `Matchs de la poule ${relatedMatches[0]?.pouleName || relatedMatches[0]?.pouleCode || ""}`}
                </span>
              </div>
              <div className="text-xs text-slate-500">Glissez horizontalement</div>
            </div>

            <HorizontalMatchSlider
              matches={relatedMatches}
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
