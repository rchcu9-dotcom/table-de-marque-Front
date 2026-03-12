import React from "react";
import { Link } from "react-router-dom";
import { useMatches } from "../hooks/useMatches";
import type { Match } from "../api/match";
import { useSelectedTeam } from "../providers/SelectedTeamProvider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeTeam(v?: string | null) {
  return (v ?? "").trim().toLowerCase();
}

function matchInvolvesTeam(match: Match, teamId?: string | null): boolean {
  if (!teamId) return false;
  const t = normalizeTeam(teamId);
  return normalizeTeam(match.teamA) === t || normalizeTeam(match.teamB) === t;
}

function getTeamResult(
  match: Match,
  teamId?: string | null
): "win" | "loss" | "draw" | null {
  if (!teamId || match.status !== "finished") return null;
  const t = normalizeTeam(teamId);
  const isA = normalizeTeam(match.teamA) === t;
  const isB = normalizeTeam(match.teamB) === t;
  if (!isA && !isB) return null;
  if (match.scoreA == null || match.scoreB == null) return null;
  if (match.scoreA === match.scoreB) return "draw";
  if (isA) return match.scoreA > match.scoreB ? "win" : "loss";
  return match.scoreB > match.scoreA ? "win" : "loss";
}

// ---------------------------------------------------------------------------
// MatchCard
// ---------------------------------------------------------------------------

function MatchCard({
  match,
  selectedTeamId,
}: {
  match: Match;
  selectedTeamId?: string | null;
}) {
  const isMyMatch = matchInvolvesTeam(match, selectedTeamId);
  const result = getTeamResult(match, selectedTeamId);

  const borderClass =
    match.status === "ongoing"
      ? "border-yellow-400 animate-pulse"
      : isMyMatch
        ? result === "win"
          ? "border-emerald-500"
          : result === "loss"
            ? "border-red-500"
            : result === "draw"
              ? "border-amber-500"
              : "border-emerald-600/50"
        : "border-slate-700";

  const bgClass =
    match.status === "ongoing"
      ? "bg-yellow-500/5"
      : isMyMatch
        ? result === "win"
          ? "bg-emerald-500/5"
          : result === "loss"
            ? "bg-red-500/5"
            : "bg-slate-800/60"
        : "bg-slate-900/60";

  const myTeam = selectedTeamId
    ? normalizeTeam(match.teamA) === normalizeTeam(selectedTeamId)
      ? "A"
      : "B"
    : null;

  const scoreAClass =
    isMyMatch && myTeam === "A" && match.status === "finished"
      ? result === "win"
        ? "text-emerald-400"
        : result === "loss"
          ? "text-red-400"
          : "text-amber-400"
      : "text-white";

  const scoreBClass =
    isMyMatch && myTeam === "B" && match.status === "finished"
      ? result === "win"
        ? "text-emerald-400"
        : result === "loss"
          ? "text-red-400"
          : "text-amber-400"
      : "text-white";

  return (
    <Link to={`/matches/${match.id}`} className="block">
      <div
        className={`rounded-lg border ${borderClass} ${bgClass} p-3 hover:bg-slate-800/80 transition-colors ${
          isMyMatch ? "ring-1 ring-emerald-400/20 border-l-4" : ""
        }`}
      >
        {/* Phase / competition badge */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">
            {match.pouleName ?? match.pouleCode ?? ""}
          </span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-mono ${
              match.competitionType === "5v5"
                ? "bg-blue-500/20 text-blue-300"
                : match.competitionType === "3v3"
                  ? "bg-purple-500/20 text-purple-300"
                  : "bg-orange-500/20 text-orange-300"
            }`}
          >
            {match.competitionType ?? "5v5"}
          </span>
        </div>

        {/* Teams + score */}
        <div className="flex items-center gap-2">
          {/* Team A */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {match.teamALogo && (
              <img
                src={match.teamALogo}
                alt=""
                className="h-6 w-6 rounded-full object-cover bg-slate-800 flex-shrink-0"
              />
            )}
            <span
              className={`text-sm font-medium truncate ${
                isMyMatch && myTeam === "A" ? "text-white" : "text-slate-200"
              }`}
            >
              {match.teamA}
            </span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {match.status === "finished" ? (
              <>
                <span
                  className={`text-base font-bold tabular-nums ${scoreAClass}`}
                >
                  {match.scoreA}
                </span>
                <span className="text-slate-600 text-sm">–</span>
                <span
                  className={`text-base font-bold tabular-nums ${scoreBClass}`}
                >
                  {match.scoreB}
                </span>
              </>
            ) : match.status === "ongoing" ? (
              <>
                <span className="text-base font-bold tabular-nums text-yellow-300">
                  {match.scoreA ?? 0}
                </span>
                <span className="text-yellow-600 text-sm animate-pulse">–</span>
                <span className="text-base font-bold tabular-nums text-yellow-300">
                  {match.scoreB ?? 0}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-600 font-mono">–:–</span>
            )}
          </div>

          {/* Team B */}
          <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
            <span
              className={`text-sm font-medium truncate text-right ${
                isMyMatch && myTeam === "B" ? "text-white" : "text-slate-200"
              }`}
            >
              {match.teamB}
            </span>
            {match.teamBLogo && (
              <img
                src={match.teamBLogo}
                alt=""
                className="h-6 w-6 rounded-full object-cover bg-slate-800 flex-shrink-0"
              />
            )}
          </div>
        </div>

        {/* Status badge */}
        {match.status === "ongoing" && (
          <div className="mt-2 flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-xs text-yellow-300">En cours</span>
          </div>
        )}
        {match.status === "finished" && result === "win" && (
          <div className="mt-1.5 text-xs text-emerald-400 font-medium">
            ✓ Victoire
          </div>
        )}
        {match.status === "finished" && result === "loss" && (
          <div className="mt-1.5 text-xs text-red-400">✗ Défaite</div>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// TournamentTimelinePage
// ---------------------------------------------------------------------------

export default function TournamentTimelinePage() {
  const { data: allMatches } = useMatches();
  const { selectedTeam } = useSelectedTeam();
  const [activeDay, setActiveDay] = React.useState<string>("J1");
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const timeSlotRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  // Determine available days
  const days = React.useMemo(() => {
    const unique = Array.from(
      new Set(
        (allMatches ?? []).map((m) => m.jour ?? "").filter(Boolean)
      )
    ).sort();
    return unique;
  }, [allMatches]);

  // Auto-set active day based on ongoing/next match
  React.useEffect(() => {
    if (!allMatches) return;
    const now = new Date();
    const dayWithOngoing = allMatches.find((m) => m.status === "ongoing")?.jour;
    const dayWithNext = allMatches
      .filter((m) => m.status === "planned" && new Date(m.date) >= now)
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )[0]?.jour;
    const best = dayWithOngoing ?? dayWithNext ?? days[0] ?? "J1";
    setActiveDay(best);
  }, [allMatches, days]);

  // Filter matches for active day (all competitions)
  const dayMatches = React.useMemo(() => {
    if (!allMatches) return [];
    return allMatches
      .filter((m) => m.jour === activeDay)
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
  }, [allMatches, activeDay]);

  // Group by time slot (exact datetime string)
  const timeSlots = React.useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of dayMatches) {
      const existing = map.get(m.date) ?? [];
      existing.push(m);
      map.set(m.date, existing);
    }
    return Array.from(map.entries()).sort(
      ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
    );
  }, [dayMatches]);

  // Auto-scroll to current/next match time slot
  React.useEffect(() => {
    if (!dayMatches.length) return;
    const now = new Date();
    const ongoing = dayMatches.find((m) => m.status === "ongoing");
    const next = dayMatches
      .filter((m) => m.status === "planned" && new Date(m.date) >= now)
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )[0];
    const target = ongoing ?? next;
    if (target) {
      const slotTime = target.date;
      setTimeout(() => {
        timeSlotRefs.current[slotTime]?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      }, 100);
    }
  }, [dayMatches]);

  const now = new Date();

  const dayLabel = (day: string) => {
    if (day === "J1") return "Sam 23/05";
    if (day === "J2") return "Dim 24/05";
    if (day === "J3") return "Lun 25/05";
    return day;
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">⏱</span> Tournoi — Suivi en
              direct
            </h1>
            {selectedTeam && (
              <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1">
                {selectedTeam.logoUrl && (
                  <img
                    src={selectedTeam.logoUrl}
                    alt=""
                    className="h-4 w-4 rounded-full object-cover"
                  />
                )}
                <span>{selectedTeam.name}</span>
              </div>
            )}
          </div>

          {/* Day tabs */}
          <div className="flex gap-2">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setActiveDay(day)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  activeDay === day
                    ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/60"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                }`}
              >
                {dayLabel(day)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div ref={containerRef} className="max-w-3xl mx-auto px-4 pt-6">
        {timeSlots.length === 0 && (
          <div className="text-center text-slate-500 mt-16 text-sm">
            Chargement du planning…
          </div>
        )}

        {timeSlots.map(([slotTime, slotMatches], slotIdx) => {
          const slotDate = new Date(slotTime);
          const isPast = slotDate < now;
          const isCurrentSlot =
            slotDate <= now &&
            (slotIdx === timeSlots.length - 1 ||
              new Date(timeSlots[slotIdx + 1][0]) > now);
          const timeLabel = slotDate.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Paris",
          });

          return (
            <div
              key={slotTime}
              ref={(el) => {
                timeSlotRefs.current[slotTime] = el;
              }}
              className="mb-6"
            >
              {/* Time separator */}
              <div
                className={`flex items-center gap-3 mb-3 ${
                  isCurrentSlot
                    ? "text-emerald-300"
                    : isPast
                      ? "text-slate-600"
                      : "text-slate-300"
                }`}
              >
                <span
                  className={`text-sm font-bold tabular-nums ${
                    isCurrentSlot ? "text-emerald-300 animate-pulse" : ""
                  }`}
                >
                  {isCurrentSlot && <span className="mr-1">▶</span>}
                  {timeLabel}
                </span>
                <div
                  className={`flex-1 h-px ${
                    isCurrentSlot
                      ? "bg-emerald-400/40"
                      : isPast
                        ? "bg-slate-800"
                        : "bg-slate-700"
                  }`}
                />
                {slotMatches[0]?.phase && (
                  <span className="text-xs text-slate-500">
                    {slotMatches[0].phase}
                  </span>
                )}
              </div>

              {/* Match cards */}
              <div className="grid gap-2 sm:grid-cols-2">
                {slotMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    selectedTeamId={selectedTeam?.id}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
