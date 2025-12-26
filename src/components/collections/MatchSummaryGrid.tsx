import React from "react";
import HexBadge from "../ds/HexBadge";
import Badge from "../ds/Badge";
import type { Match } from "../../api/match";

type Props = {
  matches: Match[];
  currentMatchId?: string;
  onSelect?: (id: string) => void;
  focusTeam?: string;
};

const statusBadgeColor: Record<Match["status"], "success" | "warning" | "muted" | "default" | "info"> = {
  planned: "muted",
  ongoing: "warning",
  finished: "info",
  deleted: "muted",
};

function resolveScoreTone(match: Match, focusTeam?: string) {
  if (
    match.scoreA === null ||
    match.scoreB === null ||
    (match.status !== "ongoing" && match.status !== "finished")
  ) {
    return statusBadgeColor[match.status];
  }

  const isTeamA = focusTeam
    ? match.teamA.toLowerCase() === focusTeam.toLowerCase()
    : true;
  const scoreFor = isTeamA ? match.scoreA : match.scoreB;
  const scoreAgainst = isTeamA ? match.scoreB : match.scoreA;

  if (scoreFor > scoreAgainst) return "success";
  if (scoreFor < scoreAgainst) return "default"; // use default as "red" substitute below
  return "muted";
}

function toneClass(tone: "success" | "warning" | "muted" | "default" | "info") {
  if (tone === "success") return "bg-slate-900/80 border border-emerald-400 text-emerald-200";
  if (tone === "warning") return "bg-slate-900/80 border border-amber-400 text-amber-200";
  if (tone === "info") return "bg-slate-900/80 border border-sky-400 text-sky-200";
  if (tone === "muted") return "bg-slate-900/80 border border-slate-600 text-slate-200";
  return "bg-slate-900/80 border border-rose-400 text-rose-200";
}

export default function MatchSummaryGrid({ matches, currentMatchId, onSelect, focusTeam }: Props) {
  if (!matches || matches.length === 0) return null;

  const selectedBorder = (m: Match) => {
    if (m.status === "ongoing") return "!border-amber-300/80";
    if (m.status === "finished") return "!border-sky-400/80";
    return "!border-slate-600/80";
  };

  return (
    <div className="relative" data-testid="summary-grid">
      <div className="flex gap-2 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory justify-center">
        {matches.map((m) => {
          const hasScore =
            (m.status === "ongoing" || m.status === "finished") &&
            m.scoreA !== null &&
            m.scoreB !== null;
          const tone = resolveScoreTone(m, focusTeam);
          return (
            <div
              key={m.id}
              data-testid={`summary-card-${m.id}`}
              className={`snap-center min-w-[90px] max-w-[100px] flex-shrink-0 rounded-xl border border-slate-800 bg-slate-900/80 px-2 py-2 shadow-inner shadow-slate-950 flex flex-col items-center gap-1 cursor-pointer transition hover:-translate-y-0.5 ${
                m.id === currentMatchId ? selectedBorder(m) : ""
              } ${m.status === "ongoing" ? "live-pulse-card" : ""}`}
              onClick={() => onSelect?.(m.id)}
            >
              <div className="flex items-center justify-center w-full gap-1">
                <HexBadge name={m.teamA} imageUrl={m.teamALogo ?? undefined} size={26} />
                <HexBadge name={m.teamB} imageUrl={m.teamBLogo ?? undefined} size={26} />
              </div>
              {hasScore ? (
                <span
                  data-testid={`summary-score-${m.id}`}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${toneClass(
                    tone,
                  )} ${m.status === "ongoing" ? "live-pulse-card" : ""}`}
                >
                  <span>{m.scoreA}</span>
                  <span className="text-slate-500">-</span>
                  <span>{m.scoreB}</span>
                </span>
              ) : (
                <Badge color={statusBadgeColor[m.status]}>
                  {m.status === "planned"
                    ? "A venir"
                    : m.status === "ongoing"
                    ? "En cours"
                    : "Terminé"}
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
