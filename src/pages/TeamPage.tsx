import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import HexBadge from "../components/ds/HexBadge";
import Badge from "../components/ds/Badge";
import Card from "../components/ds/Card";
import Spinner from "../components/ds/Spinner";
import MatchSummaryGrid from "../components/collections/MatchSummaryGrid";
import { useMatches } from "../hooks/useMatches";
import type { Match } from "../api/match";
import { fetchClassementByPoule, type ClassementEntry } from "../api/classement";

function statusLabel(status: Match["status"]): string {
  if (status === "planned") return "A venir";
  if (status === "ongoing") return "En cours";
  if (status === "finished") return "Terminé";
  return "Indisponible";
}

function formatDateLabel(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
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

  const grouped = React.useMemo(() => {
    const groups = groupByDay(filtered);
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

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
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Badge color="info">Profil API</Badge>
              <Badge color="muted">Planning dynamique</Badge>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-white/5 border-slate-800 backdrop-blur">
              <p className="text-xs text-slate-400">Forme (tous terminés)</p>
              <p className="text-lg font-semibold text-slate-50">{form.wins}G / {form.draws}N / {form.losses}P</p>
              <p className="text-xs text-slate-500">Basé sur tous les matchs terminés</p>
            </Card>
            <Card className="bg-white/5 border-slate-800 backdrop-blur">
              <p className="text-xs text-slate-400">Prochains matchs</p>
              <div className="flex flex-col gap-2 mt-2">
                {upcoming.length > 0 ? (
                  upcoming.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 text-xs bg-slate-900/70 border border-slate-800 rounded-xl px-2 py-2 cursor-pointer hover:border-slate-600"
                      onClick={() => navigate(`/matches/${m.id}`)}
                    >
                      <HexBadge name={m.teamA} size={22} imageUrl={m.teamALogo ?? undefined} />
                      <span className={focusClass(m.teamA, teamName)}>{m.teamA}</span>
                      <span className="text-slate-500 px-1">vs</span>
                      <HexBadge name={m.teamB} size={22} imageUrl={m.teamBLogo ?? undefined} />
                      <span className={focusClass(m.teamB, teamName)}>{m.teamB}</span>
                      <span className="ml-auto text-slate-300 text-[11px] text-right min-w-[100px]">{formatDateLabel(m.date)}</span>
                    </div>
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
                    <div
                      key={m.id}
                      className={`flex items-center gap-2 text-xs bg-slate-900/70 border border-slate-800 rounded-xl px-2 py-2 cursor-pointer ${m.status === "ongoing" ? "live-pulse-card" : ""}`}
                      onClick={() => navigate(`/matches/${m.id}`)}
                    >
                      <HexBadge name={m.teamA} size={22} imageUrl={m.teamALogo ?? undefined} />
                      <span className={focusClass(m.teamA, teamName)}>{m.teamA}</span>
                      <span className="text-slate-500 px-1">vs</span>
                      <HexBadge name={m.teamB} size={22} imageUrl={m.teamBLogo ?? undefined} />
                      <span className={focusClass(m.teamB, teamName)}>{m.teamB}</span>
                      <span className="ml-auto text-right min-w-[92px]">
                        <Badge
                          color={resultColor(m, teamName)}
                          variant={m.status === "ongoing" || m.status === "finished" ? "outline" : "solid"}
                        >
                          {m.status === "ongoing" || m.status === "finished" ? `${m.scoreA ?? "-"} - ${m.scoreB ?? "-"}` : statusLabel(m.status)}
                        </Badge>
                      </span>
                    </div>
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
            <h3 className="text-lg font-semibold text-slate-50">Calendrier</h3>
            <Badge color="muted">Planning multi-jours</Badge>
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
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <HexBadge name={m.teamA} size={26} imageUrl={m.teamALogo ?? undefined} />
                                <div className="text-xs text-slate-200">
                                  <div className={focusClass(m.teamA, teamName)}>{m.teamA}</div>
                                  <div className="text-slate-500">vs <span className={focusClass(m.teamB, teamName)}>{m.teamB}</span></div>
                                </div>
                              </div>
                              <Badge color="muted">
                                {statusLabel(m.status)}
                              </Badge>
                            </div>
                            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                              <span>{formatDateLabel(m.date)}</span>
                              {(m.status === "ongoing" || m.status === "finished") && (
                                <Badge color={resultColor(m, teamName)} variant="outline">
                                  {m.scoreA ?? "-"} - {m.scoreB ?? "-"}
                                </Badge>
                              )}
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
                              <span className="font-semibold text-slate-100">{e.points} pts</span>
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
