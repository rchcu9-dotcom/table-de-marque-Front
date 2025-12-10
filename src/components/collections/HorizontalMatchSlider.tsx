import React from "react";
import HexBadge from "../ds/HexBadge";
import type { Match } from "../../api/match";

type Props = {
  matches: Match[];
  currentMatchId?: string;
  onSelect?: (id: string) => void;
  testIdPrefix?: string;
  getCardClassName?: (match: Match) => string;
  centered?: boolean;
};

const statusColors: Record<Match["status"], string> = {
  planned: "bg-slate-800 text-slate-200",
  ongoing: "bg-amber-400/90 text-slate-900",
  finished: "bg-sky-400/90 text-slate-900",
  deleted: "bg-slate-700 text-slate-200",
};

export default function HorizontalMatchSlider({
  matches,
  currentMatchId,
  onSelect,
  testIdPrefix = "poule-slider-card",
  getCardClassName,
  centered = false,
}: Props) {
  if (!matches || matches.length === 0) return null;

  const sliderRef = React.useRef<HTMLDivElement | null>(null);
  const cardRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const selectedBorder = (m: Match) => {
    if (m.status === "ongoing") return "!border-amber-300/80";
    if (m.status === "finished") return "!border-sky-400/80";
    return "!border-slate-600/80";
  };

  React.useEffect(() => {
    if (!sliderRef.current || !currentMatchId) return;
    const target = cardRefs.current[currentMatchId];
    if (!target) return;
    const container = sliderRef.current;
    const targetCenter = target.offsetLeft + target.offsetWidth / 2;
    const scrollLeft = Math.max(targetCenter - container.clientWidth / 2, 0);
    container.scrollTo({ left: scrollLeft, behavior: "smooth" });
  }, [matches, currentMatchId]);

  return (
    <div className="relative">
      <div
        ref={sliderRef}
        className={`flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory ${centered ? "justify-center" : ""}`}
      >
        {matches.map((m) => (
          <div
            key={m.id}
            data-testid={`${testIdPrefix}-${m.id}`}
            ref={(el) => {
              cardRefs.current[m.id] = el;
            }}
            className={`snap-center min-w-[220px] max-w-[240px] flex-shrink-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-inner shadow-slate-950 cursor-pointer hover:-translate-y-0.5 transition ${
              m.id === currentMatchId ? selectedBorder(m) : ""
            } ${m.status === "ongoing" ? "live-pulse-card" : ""} ${getCardClassName ? getCardClassName(m) : ""}`}
            onClick={() => onSelect?.(m.id)}
          >
            <div className="flex items-center justify-end text-xs text-slate-400">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${statusColors[m.status]}`}
              >
                {m.status === "planned" && "Planifie"}
                {m.status === "ongoing" && "En cours"}
                {m.status === "finished" && "Termine"}
                {m.status === "deleted" && "Supprime"}
              </span>
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-100 text-center">
              {new Date(m.date).toLocaleString()}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <HexBadge name={m.teamA} imageUrl={m.teamALogo ?? undefined} size={40} />
              <div className="flex-1 text-center">
                <div className="text-[13px] font-semibold text-slate-100">{m.teamA}</div>
                <div className="text-[11px] text-slate-500">vs</div>
                <div className="text-[13px] font-semibold text-slate-100">{m.teamB}</div>
              </div>
              <HexBadge name={m.teamB} imageUrl={m.teamBLogo ?? undefined} size={40} />
            </div>
            {(m.status === "ongoing" || m.status === "finished") &&
              m.scoreA !== null &&
              m.scoreB !== null && (
              <div className="mt-3 flex items-center justify-center">
                  <span className={`inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-100 ${m.status === "ongoing" ? "live-pulse-card" : ""}`}>
                    <span>{m.scoreA}</span>
                    <span className="text-slate-500">-</span>
                    <span>{m.scoreB}</span>
                  </span>
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
