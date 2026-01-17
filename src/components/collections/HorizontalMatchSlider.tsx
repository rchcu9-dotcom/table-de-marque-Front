import React from "react";
import HexBadge from "../ds/HexBadge";
import type { Match } from "../../api/match";
import icon5v5 from "../../assets/icons/nav/fivev5.png";
import icon3v3 from "../../assets/icons/nav/threev3.png";
import iconChallenge from "../../assets/icons/nav/challenge.png";

type Props = {
  matches: Match[];
  currentMatchId?: string;
  onSelect?: (id: string) => void;
  testIdPrefix?: string;
  focusTestId?: string;
  getCardClassName?: (match: Match) => string;
  centered?: boolean;
  withDiagonalBg?: boolean;
  focusAlign?: "center" | "end";
};

const compIcon: Record<string, string> = {
  "5v5": icon5v5,
  "3v3": icon3v3,
  challenge: iconChallenge,
};

function winnerClass(match: Match, side: "A" | "B") {
  if (match.status !== "finished") return "text-slate-100";
  if (match.scoreA === null || match.scoreB === null) return "text-slate-100";
  if (match.scoreA === match.scoreB) return "text-slate-100";
  const isWinner = side === "A" ? match.scoreA > match.scoreB : match.scoreB > match.scoreA;
  return isWinner ? "text-emerald-300" : "text-slate-100";
}

export default function HorizontalMatchSlider({
  matches,
  currentMatchId,
  onSelect,
  testIdPrefix = "poule-slider-card",
  focusTestId,
  getCardClassName,
  centered = false,
  withDiagonalBg = false,
  focusAlign = "center",
}: Props) {
  const sliderRef = React.useRef<HTMLDivElement | null>(null);
  const cardRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const formatInfo = (match: Match) => {
    const d = new Date(match.date);
    const day = d.toLocaleDateString("fr-FR", { weekday: "short" });
    const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const label = match.pouleName || match.pouleCode || "";
    const isScored = (match.status === "finished" || match.status === "ongoing") && match.scoreA !== null && match.scoreB !== null;
    const headerPrimary = isScored ? `${match.scoreA} - ${match.scoreB}` : time;
    const headerSecondary = isScored ? "" : label ? `${label} • ${day}` : day;
    return { headerPrimary, headerSecondary };
  };

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
    const scrollLeft =
      focusAlign === "end"
        ? Math.max(target.offsetLeft + target.offsetWidth - container.clientWidth, 0)
        : Math.max(targetCenter - container.clientWidth / 2, 0);
    if (typeof container.scrollTo === "function") {
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    } else {
      container.scrollLeft = scrollLeft;
    }
  }, [matches, currentMatchId, focusAlign]);

  if (!matches || matches.length === 0) return null;

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
            className={`relative overflow-hidden snap-center min-w-[220px] max-w-[240px] flex-shrink-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-inner shadow-slate-950 cursor-pointer hover:-translate-y-0.5 transition ${
              m.id === currentMatchId ? selectedBorder(m) : ""
            } ${m.status === "ongoing" ? "live-pulse-card" : ""} ${getCardClassName ? getCardClassName(m) : ""}`}
            onClick={() => onSelect?.(m.id)}
          >
            {m.id === currentMatchId && focusTestId ? (
              <span data-testid={focusTestId} />
            ) : null}
            <div className="absolute top-2 right-2 z-10">
              <img
                src={compIcon[(m.competitionType ?? "5v5").toLowerCase()] ?? icon5v5}
                alt={m.competitionType ?? "5v5"}
                className="h-6 w-6 rounded-md bg-slate-800 object-cover"
              />
            </div>
            {withDiagonalBg && (
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <div
                  className="absolute inset-y-0 left-0 w-1/3 opacity-20"
                  style={{
                    backgroundImage: m.teamALogo ? `url(${m.teamALogo})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    maskImage: "linear-gradient(90deg, rgba(0,0,0,0.75), rgba(0,0,0,0))",
                    WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0.75), rgba(0,0,0,0))",
                    transform: "skewX(-10deg)",
                    transformOrigin: "left",
                  }}
                />
                <div className="absolute inset-y-0 left-1/3 right-1/3 pointer-events-none" />
                <div
                  className="absolute inset-y-0 right-0 w-1/3 opacity-20"
                  style={{
                    backgroundImage: m.teamBLogo ? `url(${m.teamBLogo})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    maskImage: "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.75))",
                    WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.75))",
                    transform: "skewX(-10deg)",
                    transformOrigin: "right",
                  }}
                />
              </div>
            )}
            <div className="text-sm font-semibold text-slate-100 text-center">
              {formatInfo(m).headerPrimary}
            </div>
            {formatInfo(m).headerSecondary && (
              <div className="text-xs text-slate-400 text-center">{formatInfo(m).headerSecondary}</div>
            )}
            <div className="mt-3 flex items-center justify-between gap-2">
              <HexBadge name={m.teamA} imageUrl={m.teamALogo ?? undefined} size={40} />
              <div className="flex-1 text-center">
                <div className={`text-[13px] font-semibold ${winnerClass(m, "A")}`}>{m.teamA}</div>
                <div className="text-[11px] text-slate-500">vs</div>
                <div className={`text-[13px] font-semibold ${winnerClass(m, "B")}`}>{m.teamB}</div>
              </div>
              <HexBadge name={m.teamB} imageUrl={m.teamBLogo ?? undefined} size={40} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
