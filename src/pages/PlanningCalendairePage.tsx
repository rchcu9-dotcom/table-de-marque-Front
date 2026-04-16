import React from "react";
import { useQueries } from "@tanstack/react-query";
import { useMatchesFiltered } from "../hooks/useMatches";
import { useTeams } from "../hooks/useTeams";
import { deriveTournamentDay, sortedTournamentDateKeys, tournamentDateKey } from "../utils/tournamentDate";
import planningIcon from "../assets/icons/nav/planning.png";
import { fetchClassementByPoule } from "../api/classement";

// ── Pools J2 (GROUPE_NOM DB = '1','2','3','4' → UI = Alpha/Beta/Gamma/Delta) ──
const J2_POOLS = ["Alpha", "Beta", "Gamma", "Delta"] as const;

// ── Pools J3 Phase 2 (GROUPE_NOM DB = 'G'=Losers, 'J'=Winners) ───────────────
const J3_PHASE2_POOLS = ["G", "J"] as const;

// Parse bracket alias (pA3B4 / vC1D2) → [teamA, teamB] or null
function phase1TeamsFromAlias(alias: string): [string, string] | null {
  const m = alias.match(/^[pv]([A-Z]\d)([A-Z]\d)$/);
  if (!m) return null;
  return [m[1], m[2]];
}

// ── Layout constants ──────────────────────────────────────────────────────────
const TEAM_COL_W = 120;
const ROW_H = 44;
const BAR_H = 22;
const BAR_Y_OFF = (ROW_H - BAR_H) / 2;
const HEADER_H = 36;
const CHART_W = 1500;

// ── Time range (08:00 – 21:30 covers J1, J2 and J3) ──────────────────────────
const T_START = 8 * 60;
const T_END = 21 * 60 + 30;
const T_RANGE = T_END - T_START;

// ── Colours ───────────────────────────────────────────────────────────────────
const C_5V5 = "#3b82f6";
const C_3V3 = "#a855f7";
const C_CHALLENGE = "#f59e0b";
const C_REPAS = "#22c55e";
const C_J3_P1 = "#3b82f6";
const C_J3_P2 = "#f43f5e";
const C_NOW = "#ef4444";

type GanttDay = "J1" | "J2" | "J3";

interface Bar {
  debut: string;
  fin: string;
  color: string;
  label: string;
  tip: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function addMin(hhmm: string, n: number): string {
  const t = toMin(hhmm) + n;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function dtToHHMM(dt: string | null | undefined): string | null {
  if (!dt) return null;
  const d = new Date(dt);
  if (isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function xOf(min: number): number {
  return ((min - T_START) / T_RANGE) * CHART_W;
}

function wOf(a: string, b: string): number {
  return Math.max(((toMin(b) - toMin(a)) / T_RANGE) * CHART_W, 4);
}

// ── Legend config ─────────────────────────────────────────────────────────────
const LEGEND_J1 = [
  { color: C_5V5, label: "Match 5v5" },
  { color: C_CHALLENGE, label: "Challenge" },
  { color: C_REPAS, label: "Repas" },
];
const LEGEND_J2 = [
  { color: C_5V5, label: "Match 5v5" },
  { color: C_3V3, label: "Match 3v3" },
  { color: C_REPAS, label: "Repas" },
];
const LEGEND_J3 = [
  { color: C_J3_P1, label: "Phase 1" },
  { color: C_J3_P2, label: "Phase 2" },
  { color: C_REPAS, label: "Repas" },
];

// ── Tick marks ────────────────────────────────────────────────────────────────
const HOUR_TICKS = Array.from(
  { length: Math.floor((T_END - T_START) / 60) + 1 },
  (_, i) => T_START + i * 60,
);

// ── Component ─────────────────────────────────────────────────────────────────
export default function PlanningCalendairePage() {
  const { data: allMatches } = useMatchesFiltered({});
  const { data: teams } = useTeams();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const headerRef = React.useRef<HTMLDivElement>(null);
  const [topOffset, setTopOffset] = React.useState(64);

  // Fetch J2 pool classements (Alpha/Beta/Gamma/Delta) for meal times
  const j2ClassementResults = useQueries({
    queries: J2_POOLS.map((pool) => ({
      queryKey: ["classement", pool],
      queryFn: () => fetchClassementByPoule(pool),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    })),
  });

  // Fetch J3 Phase 2 classements (G=Losers, J=Winners) for meal times
  const j3Phase2ClassementResults = useQueries({
    queries: J3_PHASE2_POOLS.map((pool) => ({
      queryKey: ["classement", pool],
      queryFn: () => fetchClassementByPoule(pool),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    })),
  });

  // Map team name (alias or resolved) → J2 meal time ISO string
  const repasJ2ByTeam = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const result of j2ClassementResults) {
      for (const eq of result.data?.equipes ?? []) {
        if (eq.repasSamedi) map.set(eq.name.trim().toLowerCase(), eq.repasSamedi);
      }
    }
    return map;
  }, [j2ClassementResults]);

  // Map alias → J3 meal time ISO string (only Phase 2 entities that have a repas)
  const repasJ3ByTeam = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const result of j3Phase2ClassementResults) {
      for (const eq of result.data?.equipes ?? []) {
        if (eq.repasSamedi) map.set(eq.name.trim().toLowerCase(), eq.repasSamedi);
      }
    }
    return map;
  }, [j3Phase2ClassementResults]);

  // Derive current tournament day (J1, J2 or J3)
  const currentDay = React.useMemo((): GanttDay => {
    const day = deriveTournamentDay(allMatches ?? [], new Date());
    return day >= 3 ? "J3" : day >= 2 ? "J2" : "J1";
  }, [allMatches]);

  const [selectedDay, setSelectedDay] = React.useState<GanttDay | null>(null);
  const activeDay: GanttDay = selectedDay ?? currentDay;

  // Map day label → date key
  const dateKeys = React.useMemo(
    () => sortedTournamentDateKeys(allMatches ?? []),
    [allMatches],
  );
  const dayDateKey =
    activeDay === "J1" ? dateKeys[0] :
    activeDay === "J2" ? dateKeys[1] :
    dateKeys[2];

  // Dynamic layout
  React.useLayoutEffect(() => {
    const update = () => {
      const appHeader = document.querySelector("header");
      const top = appHeader ? appHeader.getBoundingClientRect().height : 64;
      setTopOffset(top);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Build one row per team
  const rows = React.useMemo(() => {
    if (!allMatches || !dayDateKey) return [];

    const dayMatches = allMatches.filter(
      (m) => tournamentDateKey(m.date) === dayDateKey && m.status !== "deleted",
    );

    // For J1: use teams from API (have repas/challenge data), sorted by pouleCode
    // For J2: derive team names from matches (supports aliases A1/B2 before resolution)
    // For J3: only entities that have a repas (Phase 2 losers/winners from G/J classement)
    const teamNames: string[] =
      activeDay === "J1" && teams
        ? [...teams]
            .sort((a, b) => (a.pouleCode ?? a.name).localeCompare(b.pouleCode ?? b.name, "fr-FR"))
            .map((t) => t.name)
        : activeDay === "J3"
        ? [...repasJ3ByTeam.keys()].map((k) => {
            // restore original casing from classement data
            for (const result of j3Phase2ClassementResults) {
              const found = result.data?.equipes.find((e) => e.name.trim().toLowerCase() === k);
              if (found) return found.name.trim();
            }
            return k;
          }).sort((a, b) => a.localeCompare(b, "fr-FR"))
        : [...new Set(dayMatches.flatMap((m) => [m.teamA, m.teamB]))].sort((a, b) =>
            a.localeCompare(b, "fr-FR"),
          );

    // Map team name → Team object for repas/challenge lookup
    const teamByName = new Map((teams ?? []).map((t) => [t.name, t]));

    return teamNames.map((name): { name: string; bars: Bar[] } => {
      const team = teamByName.get(name);
      const bars: Bar[] = [];

      if (activeDay === "J1") {
        // ── 5v5 matches ────────────────────────────────────────────────────
        dayMatches
          .filter((m) => m.competitionType === "5v5" && (m.teamA === name || m.teamB === name))
          .forEach((m) => {
            const debut = dtToHHMM(m.date);
            if (!debut) return;
            const fin = addMin(debut, 22);
            bars.push({ debut, fin, color: C_5V5, label: "5v5",
              tip: `Match 5v5 · ${debut}–${fin} · vs ${m.teamA === name ? m.teamB : m.teamA}` });
          });

        // ── Challenge ──────────────────────────────────────────────────────
        const challengeDebut = dtToHHMM(team?.challengeSamedi);
        if (challengeDebut) {
          const challengeFin = addMin(challengeDebut, 40);
          bars.push({ debut: challengeDebut, fin: challengeFin, color: C_CHALLENGE, label: "C",
            tip: `Challenge · ${challengeDebut}–${challengeFin}` });
        }

        // ── Repas ──────────────────────────────────────────────────────────
        const repasDebut = dtToHHMM(team?.repasSamedi);
        if (repasDebut) {
          const repasFin = addMin(repasDebut, 40);
          bars.push({ debut: repasDebut, fin: repasFin, color: C_REPAS, label: "R",
            tip: `Repas · ${repasDebut}–${repasFin}` });
        }
      }

      if (activeDay === "J2") {
        // ── 5v5 matches ────────────────────────────────────────────────────
        dayMatches
          .filter((m) => m.competitionType === "5v5" && (m.teamA === name || m.teamB === name))
          .forEach((m) => {
            const debut = dtToHHMM(m.date);
            if (!debut) return;
            const fin = addMin(debut, 22);
            bars.push({ debut, fin, color: C_5V5, label: "5v5",
              tip: `Match 5v5 · ${debut}–${fin} · vs ${m.teamA === name ? m.teamB : m.teamA}` });
          });

        // ── 3v3 matches ────────────────────────────────────────────────────
        dayMatches
          .filter((m) => m.competitionType === "3v3" && (m.teamA === name || m.teamB === name))
          .forEach((m) => {
            const debut = dtToHHMM(m.date);
            if (!debut) return;
            const fin = addMin(debut, 30);
            bars.push({ debut, fin, color: C_3V3, label: "3v3",
              tip: `Match 3v3 · ${debut}–${fin} · vs ${m.teamA === name ? m.teamB : m.teamA}` });
          });

        // ── Repas J2 (depuis ta_classement REPAS_SAMEDI pool J2) ──────────
        const repasJ2Iso = repasJ2ByTeam.get(name.trim().toLowerCase());
        const repasDebut = dtToHHMM(repasJ2Iso ?? null);
        if (repasDebut) {
          const repasFin = addMin(repasDebut, 40);
          bars.push({ debut: repasDebut, fin: repasFin, color: C_REPAS, label: "R",
            tip: `Repas · ${repasDebut}–${repasFin}` });
        }
      }

      if (activeDay === "J3") {
        // Phase 1 = teams matching ^[A-D][1-4]$, Phase 2 = bracket aliases ^[vp][A-D][1-4][A-D][1-4]$
        const p1Re = /^[A-D][1-4]$/;
        const p2Re = /^[vp][A-D][1-4][A-D][1-4]$/;
        const j3P1Matches = dayMatches.filter(
          (m) => m.competitionType === "5v5" && p1Re.test(m.teamA) && p1Re.test(m.teamB),
        );
        const j3P2Matches = dayMatches.filter(
          (m) => m.competitionType === "5v5" && p2Re.test(m.teamA) && p2Re.test(m.teamB),
        );

        // ── Phase 1 match — dérivé depuis l'alias (pA3B4 → cherche A3 vs B4) ──
        const p1Teams = phase1TeamsFromAlias(name);
        if (p1Teams) {
          const [t1, t2] = p1Teams;
          const p1Match = j3P1Matches.find(
            (m) => (m.teamA === t1 && m.teamB === t2) || (m.teamA === t2 && m.teamB === t1),
          );
          if (p1Match) {
            const debut = dtToHHMM(p1Match.date);
            if (debut) {
              const fin = addMin(debut, 27);
              bars.push({ debut, fin, color: C_J3_P1, label: "P1",
                tip: `Phase 1 · ${debut}–${fin} · ${t1} vs ${t2}` });
            }
          }
        }

        // ── Phase 2 match ──────────────────────────────────────────────────
        j3P2Matches
          .filter((m) => m.teamA === name || m.teamB === name)
          .forEach((m) => {
            const debut = dtToHHMM(m.date);
            if (!debut) return;
            const fin = addMin(debut, 27);
            bars.push({ debut, fin, color: C_J3_P2, label: "P2",
              tip: `Phase 2 · ${debut}–${fin} · vs ${m.teamA === name ? m.teamB : m.teamA}` });
          });

        // ── Repas J3 ───────────────────────────────────────────────────────
        const repasJ3Iso = repasJ3ByTeam.get(name.trim().toLowerCase());
        const repasDebut = dtToHHMM(repasJ3Iso ?? null);
        if (repasDebut) {
          const repasFin = addMin(repasDebut, 40);
          bars.push({ debut: repasDebut, fin: repasFin, color: C_REPAS, label: "R",
            tip: `Repas · ${repasDebut}–${repasFin}` });
        }
      }

      return { name, bars };
    });
  }, [allMatches, teams, activeDay, dayDateKey, repasJ2ByTeam, repasJ3ByTeam, j3Phase2ClassementResults]);

  // SVG dimensions
  const SVG_H = HEADER_H + rows.length * ROW_H + 10;

  // Tooltip
  const [tooltip, setTooltip] = React.useState<{ x: number; y: number; text: string } | null>(null);

  // Center scroll on current time when day or data changes
  React.useEffect(() => {
    if (!scrollRef.current || rows.length === 0) return;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const xNow = xOf(nowMin);
    const containerW = scrollRef.current.clientWidth;
    scrollRef.current.scrollLeft = Math.max(0, xNow - containerW / 2 - TEAM_COL_W);
  }, [activeDay, rows.length]);

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const legend =
    activeDay === "J1" ? LEGEND_J1 :
    activeDay === "J2" ? LEGEND_J2 :
    LEGEND_J3;

  return (
    <div
      className="fixed inset-x-0 bottom-0 flex flex-col overflow-hidden"
      style={{ top: topOffset }}
    >
      {/* ── Fixed header ──────────────────────────────────────────────────── */}
      <div
        ref={headerRef}
        className="bg-slate-900 border-b border-slate-800 px-4 pt-3 pb-2 shadow-md flex-shrink-0"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-800/80 flex-shrink-0">
            <img
              src={planningIcon}
              alt=""
              className="h-full w-full object-cover scale-150"
              loading="lazy"
            />
          </div>
          <h1 className="text-lg font-semibold text-white">Planning Calendaire</h1>
          <div className="flex gap-2 ml-auto">
            {(["J1", "J2", "J3"] as GanttDay[]).map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                  activeDay === day
                    ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300 font-semibold"
                    : "bg-transparent border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4 flex-wrap">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: item.color }} />
              <span className="text-xs text-slate-400">{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-2">
            <div className="w-3 h-0.5 flex-shrink-0" style={{ background: C_NOW }} />
            <span className="text-xs text-slate-400">Maintenant</span>
          </div>
        </div>
      </div>

      {/* ── Gantt area — single scroll container ─────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onMouseLeave={() => setTooltip(null)}
      >
        <div style={{ display: "flex", minWidth: TEAM_COL_W + CHART_W + 10 }}>
          {/* Sticky team name column */}
          <div
            className="flex-shrink-0 bg-slate-950 border-r border-slate-800 z-10"
            style={{
              position: "sticky",
              left: 0,
              width: TEAM_COL_W,
            }}
          >
            {/* Spacer matching SVG time-axis header */}
            <div
              style={{ height: HEADER_H }}
              className="border-b border-slate-700 bg-slate-900"
            />
            {rows.map((row, i) => (
              <div
                key={row.name}
                style={{
                  height: ROW_H,
                  background: i % 2 === 0 ? "#111827" : "#0f172a",
                  borderBottom: "1px solid #1e293b",
                }}
                className="flex items-center px-2"
              >
                <span className="text-xs text-slate-300 font-medium truncate leading-tight">
                  {row.name}
                </span>
              </div>
            ))}
          </div>

          {/* SVG chart */}
          <svg
            width={CHART_W + 10}
            height={SVG_H}
            style={{ display: "block", flexShrink: 0 }}
          >
            {/* Background */}
            <rect x={0} y={0} width={CHART_W + 10} height={SVG_H} fill="#0f172a" />

            {/* Row backgrounds */}
            {rows.map((_, i) => (
              <rect
                key={i}
                x={0}
                y={HEADER_H + i * ROW_H}
                width={CHART_W + 10}
                height={ROW_H}
                fill={i % 2 === 0 ? "#111827" : "#0f172a"}
              />
            ))}

            {/* Hour grid + labels */}
            {HOUR_TICKS.map((min) => {
              const x = xOf(min);
              const h = String(Math.floor(min / 60)).padStart(2, "0");
              return (
                <g key={min}>
                  <line x1={x} y1={HEADER_H} x2={x} y2={SVG_H - 5} stroke="#1e3a5f" strokeWidth={1} />
                  <text x={x} y={HEADER_H - 6} fill="#64748b" fontSize={11} textAnchor="middle">
                    {h}:00
                  </text>
                </g>
              );
            })}

            {/* Header bottom line */}
            <line x1={0} y1={HEADER_H} x2={CHART_W + 10} y2={HEADER_H} stroke="#334155" strokeWidth={1} />

            {/* Row separators */}
            {rows.map((_, i) => (
              <line
                key={i}
                x1={0}
                y1={HEADER_H + (i + 1) * ROW_H}
                x2={CHART_W + 10}
                y2={HEADER_H + (i + 1) * ROW_H}
                stroke="#1e293b"
                strokeWidth={1}
              />
            ))}

            {/* Bars */}
            {rows.map((row, i) => {
              const y = HEADER_H + i * ROW_H;
              return row.bars.map((bar, j) => {
                const x = xOf(toMin(bar.debut));
                const w = wOf(bar.debut, bar.fin);
                return (
                  <g
                    key={j}
                    cursor="pointer"
                    onMouseEnter={(e) =>
                      setTooltip({ x: e.clientX + 14, y: e.clientY - 32, text: bar.tip })
                    }
                    onMouseMove={(e) =>
                      setTooltip({ x: e.clientX + 14, y: e.clientY - 32, text: bar.tip })
                    }
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <rect
                      x={x}
                      y={y + BAR_Y_OFF}
                      width={w}
                      height={BAR_H}
                      fill={bar.color}
                      rx={4}
                    />
                    {w > 24 && (
                      <text
                        x={x + w / 2}
                        y={y + BAR_Y_OFF + BAR_H / 2 + 4}
                        fill="#fff"
                        fontSize={9}
                        textAnchor="middle"
                        fontWeight="600"
                        pointerEvents="none"
                      >
                        {bar.label}
                      </text>
                    )}
                  </g>
                );
              });
            })}

            {/* Current time line */}
            {nowMin >= T_START && nowMin <= T_END && (
              <line
                x1={xOf(nowMin)}
                y1={HEADER_H}
                x2={xOf(nowMin)}
                y2={SVG_H - 5}
                stroke={C_NOW}
                strokeWidth={1.5}
                strokeDasharray="4,3"
              />
            )}
          </svg>
        </div>
      </div>

      {/* ── Tooltip ───────────────────────────────────────────────────────── */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-800 border border-slate-600 text-white text-xs rounded px-2 py-1.5 shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text.split(" · ").map((line, i) => (
            <div key={i} className={i === 0 ? "font-semibold" : "text-slate-300"}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
