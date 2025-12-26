import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import HexBadge from "../components/ds/HexBadge";
import Badge from "../components/ds/Badge";
import Card from "../components/ds/Card";
import Spinner from "../components/ds/Spinner";
import MatchSummaryGrid from "../components/collections/MatchSummaryGrid";
import { useMatches } from "../hooks/useMatches";
import { useTeams } from "../hooks/useTeams";
import type { Match } from "../api/match";
import { fetchClassementByPoule, type ClassementEntry } from "../api/classement";
import { usePlayersByEquipe } from "../hooks/usePlayers";

function formatDateLabel(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatDayTimeLabel(date: string) {
  const d = new Date(date);
  return d.toLocaleString("fr-FR", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeLabel(date: string) {
  const d = new Date(date);
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeTeamName(team?: string) {
  return (team ?? "").trim().toLowerCase();
}

function computeForm(matches: Match[], team: string) {
  const finished = matches.filter((m) => m.status === "finished" && m.scoreA !== null && m.scoreB !== null);
  const ordered = [...finished].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let wins = 0;
  let losses = 0;
  let draws = 0;

  ordered.forEach((m) => {
    const isTeamA = normalizeTeamName(m.teamA) === normalizeTeamName(team);
    const scoreFor = isTeamA ? m.scoreA! : m.scoreB!;
    const scoreAgainst = isTeamA ? m.scoreB! : m.scoreA!;
    if (scoreFor > scoreAgainst) wins += 1;
    else if (scoreFor < scoreAgainst) losses += 1;
    else draws += 1;
  });

  return { wins, losses, draws };
}

function getUpcoming(matches: Match[]) {
  return [...matches]
    .filter((m) => m.status === "planned")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);
}

function getRecent(matches: Match[]) {
  return [...matches]
    .filter((m) => m.status === "ongoing" || m.status === "finished")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
}

function groupByDay(matches: Match[]) {
  return matches.reduce<Record<string, Match[]>>((acc, m) => {
    const day = new Date(m.date).toISOString().split("T")[0];
    acc[day] = acc[day] ? [...acc[day], m] : [m];
    return acc;
  }, {});
}

function resultColor(match: Match, focusTeam: string): "success" | "danger" | "muted" | "warning" {
  if (match.status === "ongoing") return "warning";
  if (match.status !== "finished") return "muted";
  if (match.scoreA === null || match.scoreB === null) return "muted";
  const isTeamA = normalizeTeamName(match.teamA) === normalizeTeamName(focusTeam);
  const scoreFor = isTeamA ? match.scoreA : match.scoreB;
  const scoreAgainst = isTeamA ? match.scoreB : match.scoreA;
  if (scoreFor > scoreAgainst) return "success";
  if (scoreFor < scoreAgainst) return "danger";
  return "muted";
}

function focusClass(name: string, focusTeam: string) {
  return normalizeTeamName(name) === normalizeTeamName(focusTeam)
    ? "font-semibold text-slate-50"
    : "text-slate-400";
}

function pickTeamLogo(matches: Match[], focusTeam: string, fallback?: string | null) {
  const needle = normalizeTeamName(focusTeam);
  for (const m of matches) {
    if (normalizeTeamName(m.teamA) === needle && m.teamALogo) return m.teamALogo;
    if (normalizeTeamName(m.teamB) === needle && m.teamBLogo) return m.teamBLogo;
  }
  return fallback ?? undefined;
}

export default function TeamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const teamName = decodeURIComponent(id ?? "").trim();
  const { data: matches, isLoading, isError } = useMatches();
  const { data: allTeams } = useTeams();

  const filtered = React.useMemo(() => {
    if (!matches) return [];
    const needle = normalizeTeamName(teamName);
    return matches.filter(
      (m) =>
        normalizeTeamName(m.teamA) === needle ||
        normalizeTeamName(m.teamB) === needle,
    );
  }, [matches, teamName]);

  const sample = filtered[0];
  const pouleCode = sample?.pouleCode ?? sample?.pouleName;

  const classement = useQuery({
    queryKey: ["classement", pouleCode],
    queryFn: () => fetchClassementByPoule(pouleCode!),
    enabled: !!pouleCode,
    staleTime: 5 * 60_000,
  });

  const teamEntry: ClassementEntry | undefined = React.useMemo(() => {
    if (!classement.data) return undefined;
    const needle = normalizeTeamName(teamName);
    return classement.data.equipes.find(
      (e) => normalizeTeamName(e.name) === needle,
    );
  }, [classement.data, teamName]);

  const heroLogo = React.useMemo(
    () => pickTeamLogo(filtered, teamName, sample?.teamALogo ?? sample?.teamBLogo),
    [filtered, sample, teamName],
  );

  const upcoming = getUpcoming(filtered);
  const recent = getRecent(filtered);
  const form = computeForm(filtered, teamName);
  const equipeKey = React.useMemo(() => {
    const needle = normalizeTeamName(teamName);
    const found = allTeams?.find(
      (t) => normalizeTeamName(t.name) === needle || normalizeTeamName(t.id) === needle,
    );
    // On interroge l'API joueurs avec l'id court (nom court) pour matcher le seeder mock.
    return found?.id ?? teamName;
  }, [allTeams, teamName]);
  const players = usePlayersByEquipe(equipeKey || undefined);

  const grouped = React.useMemo(() => {
    const groups = groupByDay(filtered);
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const badgeContent = (match: Match) => {
    if (match.status === "planned") {
      return formatDayTimeLabel(match.date);
    }
    if (match.status === "finished" || match.status === "ongoing") {
      return `${match.scoreA ?? "-"} - ${match.scoreB ?? "-"}`;
    }
    return "Indisponible";
  };

  if (!teamName) {
    return (
      <div className="p-6 text-slate-100">
        <p>Equipe introuvable.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Spinner />
      </div>
    );
  }

  if (isError || filtered.length === 0) {
    return (
      <div className="p-6 text-slate-100 space-y-4">
        <p>Impossible de charger les données pour {teamName}.</p>
        <button
          className="text-sky-400 underline"
          onClick={() => navigate(-1)}
          type="button"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(236,72,153,0.14),transparent_45%)]" />
        <div className="relative px-6 pb-8 pt-6 md:px-10 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <HexBadge name={teamName} size={68} imageUrl={heroLogo} />
              <div>
                <p className="text-sm uppercase tracking-[0.08em] text-slate-400">Equipe</p>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-50">
                  <span className="font-extrabold text-slate-50">{teamName}</span>
                </h1>
                <p className="text-slate-400 text-sm">{sample?.pouleName ?? sample?.pouleCode ?? "Poule inconnue"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-white/5 border-slate-800 backdrop-blur">
              <p className="text-xs text-slate-400">Forme (tous terminés)</p>
              <p className="text-lg font-semibold text-slate-50">{form.wins}G / {form.draws}N / {form.losses}P</p>
              <p className="text-xs text-slate-500">Basée sur tous les matchs terminés</p>
            </Card>
            <Card className="bg-white/5 border-slate-800 backdrop-blur">
              <p className="text-xs text-slate-400">Prochains matchs</p>
              <div className="flex flex-col gap-2 mt-2">
                {upcoming.length > 0 ? (
                  upcoming.map((m) => (
                    <InlineMatchCard
                      key={m.id}
                      match={m}
                      focusTeam={teamName}
                      onSelect={(id) => navigate(`/matches/${id}`)}
                    />
                  ))
                ) : (
                  <span className="text-slate-500 text-sm">Aucun match à venir</span>
                )}
              </div>
            </Card>
            <Card className="bg-white/5 border-slate-800 backdrop-blur">
              <p className="text-xs text-slate-400">Derniers matchs</p>
              <div className="flex flex-col gap-2 mt-2">
                {recent.length > 0 ? (
                  recent.map((m) => (
                    <InlineMatchCard
                      key={m.id}
                      match={m}
                      focusTeam={teamName}
                      onSelect={(id) => navigate(`/matches/${id}`)}
                    />
                  ))
                ) : (
                  <span className="text-slate-500 text-sm">Pas de match joué</span>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10 pb-12 space-y-10 max-w-6xl mx-auto">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-50">Effectif</h3>
          </div>
          <PlayersGrid players={players.data} loading={players.isLoading} />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-50">Planning</h3>
          </div>
          {grouped.map(([day, dayMatches]) => (
            <div key={day} className="space-y-3">
              <Card className="bg-white/5 border-slate-800 backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-200">
                    {new Date(day).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <Badge color="muted">{dayMatches.length} match(s)</Badge>
                </div>
                <div className="space-y-3 mt-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-400 mb-2">Calendrier</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dayMatches
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((m) => (
                          <Card
                            key={m.id}
                            className={`bg-slate-900/80 border-slate-800 hover:border-slate-600 transition cursor-pointer ${m.status === "ongoing" ? "live-pulse-card" : ""}`}
                            onClick={() => navigate(`/matches/${m.id}`)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <HexBadge name={m.teamA} size={26} imageUrl={m.teamALogo ?? undefined} />
                                <div className="text-xs text-slate-200">
                                  <div className={focusClass(m.teamA, teamName)}>{m.teamA}</div>
                                  <div className="text-slate-500">
                                    vs <span className={focusClass(m.teamB, teamName)}>{m.teamB}</span>
                                  </div>
                                </div>
                                <HexBadge name={m.teamB} size={26} imageUrl={m.teamBLogo ?? undefined} />
                              </div>
                              <Badge color="muted" variant="solid">
                                {formatTimeLabel(m.date)}
                              </Badge>
                            </div>
                            <div className="mt-2 text-xs text-slate-400 flex items-center justify-end">
                              <Badge color={resultColor(m, teamName)} variant="outline">
                                {m.status === "finished" || m.status === "ongoing"
                                  ? `${m.scoreA ?? "-"} - ${m.scoreB ?? "-"}`
                                  : formatDayTimeLabel(m.date)}
                              </Badge>
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>

                  {classement.data && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-400 mb-2">Classement</p>
                      <div className="divide-y divide-slate-800 text-sm text-slate-200">
                        {classement.data.equipes.slice(0, 6).map((e) => (
                          <div
                            key={e.id ?? e.name}
                            className={`flex items-center justify-between py-1.5 ${
                              normalizeTeamName(e.name) === normalizeTeamName(teamName)
                                ? "text-slate-50 font-semibold"
                                : "text-slate-400"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6">{e.rang}</span>
                              <span className={focusClass(e.name, teamName)}>{e.name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span
                                className={`${
                                  normalizeTeamName(e.name) === normalizeTeamName(teamName)
                                    ? "font-semibold text-slate-100"
                                    : "font-normal text-slate-300"
                                }`}
                              >
                                {e.points} pts
                              </span>
                              <span>{e.victoires}G</span>
                              <span>{e.nuls}N</span>
                              <span>{e.defaites}P</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function InlineMatchCard({
  match,
  focusTeam,
  onSelect,
}: {
  match: Match;
  focusTeam: string;
  onSelect?: (id: string) => void;
}) {
  const isLive = match.status === "ongoing";
  const isFinished = match.status === "finished" && match.scoreA !== null && match.scoreB !== null;
  const outcome = resultColor(match, focusTeam);
  const scoreText =
    isFinished || isLive
      ? `${match.scoreA ?? "-"} - ${match.scoreB ?? "-"}`
      : formatTimeLabel(match.date);
  const normalizedFocus = normalizeTeamName(focusTeam);
  const isFocusA = normalizeTeamName(match.teamA) === normalizedFocus;
  const isFocusB = normalizeTeamName(match.teamB) === normalizedFocus;

  let focusOutcome: "win" | "lose" | "draw" | undefined = undefined;
  if (isFinished && match.scoreA !== null && match.scoreB !== null && (isFocusA || isFocusB)) {
    const diff = isFocusA ? match.scoreA - match.scoreB : match.scoreB - match.scoreA;
    focusOutcome = diff > 0 ? "win" : diff < 0 ? "lose" : "draw";
  }

  const scoreColorClass =
    focusOutcome === "win"
      ? "text-emerald-300 font-semibold"
      : focusOutcome === "lose"
        ? "text-rose-300 font-semibold"
        : focusOutcome === "draw"
          ? "text-slate-200 font-semibold"
          : "text-slate-100 font-semibold";
  const nameClass = (isFocus: boolean) => {
    if (!isFocus) return "text-slate-200";
    if (focusOutcome === "win") return "text-emerald-300 font-semibold";
    if (focusOutcome === "lose") return "text-rose-300 font-semibold";
    if (focusOutcome === "draw") return "text-slate-50 font-semibold";
    return "text-slate-50 font-semibold";
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${
        isLive ? "border-amber-400 ring-1 ring-amber-300/60 live-pulse-card" : "border-slate-800"
      } bg-slate-900/80 px-3 py-2 cursor-pointer hover:border-slate-600`}
      onClick={() => onSelect?.(match.id)}
    >
      {match.teamALogo && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 opacity-20">
          <div
            className="absolute inset-0 -skew-x-12 scale-110"
            style={{
              backgroundImage: `url(${match.teamALogo})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </div>
      )}
      {match.teamBLogo && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-20">
          <div
            className="absolute inset-0 skew-x-12 scale-110"
            style={{
              backgroundImage: `url(${match.teamBLogo})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </div>
      )}

      <div className="relative flex items-center gap-2">
        <div className="flex items-center gap-1 min-w-0 justify-start flex-1">
          {match.teamALogo ? (
            <img src={match.teamALogo} alt={match.teamA} className="h-5 w-5 rounded-full object-cover" />
          ) : (
            <HexBadge name={match.teamA} size={20} />
          )}
          <span className={`text-[12px] leading-tight font-normal truncate block whitespace-nowrap ${nameClass(isFocusA)}`}>{match.teamA}</span>
        </div>

        <div className="flex-none w-20 text-center">
          {isFinished || isLive ? (
            <span className="text-[12px] leading-tight font-semibold text-slate-100 whitespace-nowrap">
              <span className={scoreColorClass}>{match.scoreA}</span>
              <span className="mx-1 text-slate-400">-</span>
              <span className={scoreColorClass}>{match.scoreB}</span>
            </span>
          ) : (
            <span className="text-[12px] leading-tight font-semibold text-slate-100 whitespace-nowrap">{scoreText}</span>
          )}
        </div>

        <div className="flex items-center gap-1 justify-end min-w-0 flex-1">
          <span
            className={`text-[12px] leading-tight font-normal truncate text-right block whitespace-nowrap ${nameClass(isFocusB)}`}
          >
            {match.teamB}
          </span>
          {match.teamBLogo ? (
            <img src={match.teamBLogo} alt={match.teamB} className="h-5 w-5 rounded-full object-cover" />
          ) : (
            <HexBadge name={match.teamB} size={20} />
          )}
        </div>
      </div>
    </div>
  );
}

function PlayersGrid({
  players,
  loading,
}: {
  players?: { id: string; name: string; numero: number; poste: string }[];
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-slate-300 text-sm">Chargement…</p>;
  }
  if (!players || players.length === 0) {
    return <p className="text-slate-300 text-sm">Aucun joueur disponible.</p>;
  }
  const sorted = [...players].sort((a, b) => a.numero - b.numero);
  return (
    <div className="space-y-2">
      {sorted.map((p) => (
        <div
          key={p.id}
          className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white font-bold text-sm">
              {p.numero}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{p.name}</div>
              <div className="text-xs uppercase text-slate-400">{p.poste}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

