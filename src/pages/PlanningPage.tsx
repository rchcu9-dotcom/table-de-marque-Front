import React from "react";
import { useMatches } from "../hooks/useMatches";
import { useTeams } from "../hooks/useTeams";
import type { Match } from "../api/match";
import HexBadge from "../components/ds/HexBadge";
import { useNavigate } from "react-router-dom";

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function formatDateTime(date: string) {
  const d = new Date(date);
  return d.toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function PlanningPage() {
  const { data: matches } = useMatches();
  const { data: teams } = useTeams();
  const navigate = useNavigate();
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const [teamFilter, setTeamFilter] = React.useState<string>("");
  const [competitionFilter, setCompetitionFilter] = React.useState<Set<string>>(new Set(["5v5"]));
  const [dayFilter, setDayFilter] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState<string>("");
  const filterRef = React.useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = React.useState<{ topOffset: number; paddingTop: number }>({ topOffset: 64, paddingTop: 320 });

  const COMPETITION_ICONS: Record<string, string> = {
    "5v5": "https://drive.google.com/thumbnail?id=1vIehJkzRKfVUUxP86EzX7jaTpD2Wr4AO&sz=w96",
    "3v3": "https://drive.google.com/thumbnail?id=1q2Lqml8IzvI0l348pQnRZb5te4nm4bIh&sz=w96",
    challenge: "https://drive.google.com/thumbnail?id=1BlOlsgBPdgob1SgoN3HXcs-PEcUM8TIh&sz=w96",
  };

  const teamOptions = React.useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();
    (teams ?? []).forEach((t) => {
      const val = t.id ?? t.name;
      if (val && !seen.has(val)) {
        seen.add(val);
        opts.push({ value: val, label: t.name ?? t.id ?? val });
      }
    });
    if (opts.length === 0) {
      (matches ?? []).forEach((m) => {
        [m.teamA, m.teamB].forEach((team) => {
          if (team && !seen.has(team)) {
            seen.add(team);
            opts.push({ value: team, label: team });
          }
        });
      });
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [teams, matches]);

  const dayOptions = React.useMemo(() => {
    const uniques = Array.from(new Set((matches ?? []).map((m) => new Date(m.date).toISOString().split("T")[0]))).sort();
    return uniques.map((d) => ({
      value: d,
      label: new Date(d).toLocaleDateString("fr-FR", { weekday: "long" }),
    }));
  }, [matches]);

  React.useEffect(() => {
    if (dayOptions.length && dayFilter.size === 0) {
      setDayFilter(new Set(dayOptions.map((d) => d.value)));
    }
  }, [dayOptions, dayFilter.size]);

  const filtered = React.useMemo(() => {
    if (!matches) return [];
    const q = normalize(search);
    return [...matches]
      .filter((m) => {
        if (competitionFilter.size > 0 && !competitionFilter.has(m.competitionType ?? "")) return false;
        const matchDay = new Date(m.date).toISOString().split("T")[0];
        if (dayFilter.size > 0 && !dayFilter.has(matchDay)) return false;
        if (teamFilter) {
          const needle = normalize(teamFilter);
          if (normalize(m.teamA) !== needle && normalize(m.teamB) !== needle) return false;
        }
        if (q) {
          const haystacks = [m.teamA, m.teamB, m.pouleName, m.pouleCode, m.competitionType, m.surface].map(normalize);
          if (!haystacks.some((h) => h.includes(q))) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [matches, competitionFilter, dayFilter, teamFilter, search]);

  const buildCardClasses = (status: Match["status"]) => {
    if (status === "ongoing") {
      return "border-yellow-400 bg-yellow-500/10 animate-pulse";
    }
    return "border-slate-800 bg-slate-950/70";
  };

  const computeWinner = (m: Match) => {
    if (m.status !== "finished") return null;
    if (m.scoreA == null || m.scoreB == null) return null;
    if (m.scoreA === m.scoreB) return null;
    return m.scoreA > m.scoreB ? m.teamA : m.teamB;
  };

  React.useEffect(() => {
    if (!filtered.length) return;
    const ongoing = filtered.find((m) => m.competitionType === "5v5" && m.status === "ongoing");
    const targetId = ongoing?.id ?? filtered.find((m) => m.status === "ongoing")?.id;
    if (targetId && itemRefs.current[targetId]) {
      itemRefs.current[targetId]?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [filtered]);

  React.useLayoutEffect(() => {
    const updateLayout = () => {
      const header = document.querySelector("header");
      const headerHeight = header ? header.getBoundingClientRect().height : 64;
      const filterHeight = filterRef.current ? filterRef.current.getBoundingClientRect().height : 220;
      const gap = 8;
      const topOffset = headerHeight + gap;
      const paddingTop = topOffset + filterHeight + gap;
      setLayout({ topOffset, paddingTop });
    };
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute left-0 right-0 px-4" style={{ top: `${layout.topOffset}px` }}>
        <div
          className="max-w-6xl mx-auto rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-md shadow-slate-950"
          ref={filterRef}
        >
          <h1 className="text-xl font-semibold text-white mb-3">Planning</h1>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Recherche</label>
              <input
                className="rounded-md border border-slate-700 bg-slate-950 text-slate-100 px-2 py-1 text-sm"
                type="text"
                placeholder="Equipe, poule, competition..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Equipe</label>
              <select
                className="rounded-md border border-slate-700 bg-slate-950 text-slate-100 px-2 py-1 text-sm"
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
              >
                <option value="">Toutes</option>
                {teamOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-2">
                {["5v5", "3v3", "challenge"].map((c) => {
                  const active = competitionFilter.has(c);
                  const label = c === "challenge" ? "Challenge" : c;
                  const icon = COMPETITION_ICONS[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        const next = new Set(competitionFilter);
                        if (next.has(c)) {
                          next.delete(c);
                        } else {
                          next.add(c);
                        }
                        setCompetitionFilter(next);
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold flex items-center gap-2 ${
                        active
                          ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/60"
                          : "bg-slate-800 text-slate-200 border-slate-600"
                      }`}
                    >
                      {icon && (
                        <span
                          className="h-5 w-5 rounded-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${icon})` }}
                        />
                      )}
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-2">
                {dayOptions.map((d) => {
                  const active = dayFilter.has(d.value) || dayFilter.size === 0;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => {
                        const next = new Set(dayFilter);
                        if (next.has(d.value)) {
                          next.delete(d.value);
                        } else {
                          next.add(d.value);
                        }
                        setDayFilter(next);
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        active
                          ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/60"
                          : "bg-slate-800 text-slate-200 border-slate-600"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute inset-x-4 bottom-4"
        style={{
          top: `${layout.paddingTop}px`,
          height: `calc(100vh - ${layout.paddingTop}px - 24px)`,
        }}
      >
        <div
          className="max-w-6xl mx-auto h-full rounded-xl border border-slate-800 bg-slate-900/60 p-4 overflow-y-auto"
          ref={listRef}
        >
          {filtered.length === 0 ? (
            <p className="text-slate-300 text-sm">Aucun match a afficher.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((m) => (
                <div
                  key={m.id}
                  ref={(el) => {
                    itemRefs.current[m.id] = el;
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    m.competitionType === "challenge" ? navigate(`/challenge/${m.teamA}`) : navigate(`/matches/${m.id}`)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (m.competitionType === "challenge") {
                        navigate(`/challenge/${m.teamA}`);
                      } else {
                        navigate(`/matches/${m.id}`);
                      }
                    }
                  }}
                  className={`relative overflow-hidden rounded-lg px-3 py-2 cursor-pointer transition-colors border ${buildCardClasses(m.status ?? "planned")}`}
                >
                  <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
                    <div
                      className="absolute inset-y-0 left-0 w-1/3 opacity-15"
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
                    {m.competitionType !== "challenge" && (
                      <div
                        className="absolute inset-y-0 right-0 w-1/3 opacity-15"
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
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>{m.pouleName ?? m.pouleCode ?? "Poule"}</span>
                    <span>
                      {new Date(m.date).toLocaleDateString("fr-FR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    {m.competitionType === "challenge" ? (
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <HexBadge name={m.teamA} imageUrl={m.teamALogo ?? undefined} size={36} />
                        <div className="text-sm font-semibold text-slate-100 truncate">{m.teamA}</div>
                      </div>
                    ) : (
                      (() => {
                        const winner = computeWinner(m);
                        return (
                          <>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <HexBadge name={m.teamA} imageUrl={m.teamALogo ?? undefined} size={36} />
                              <div className="text-sm font-semibold">
                                <div className={`${winner === m.teamA ? "text-emerald-300" : "text-slate-100"}`}>
                                  {m.teamA}
                                </div>
                              </div>
                            </div>
                            <div className="w-28 flex-shrink-0 flex flex-col items-center text-sm text-slate-200 text-center">
                              {m.scoreA !== null && m.scoreB !== null ? (
                                <div className="font-semibold flex items-center gap-1">
                                  <span className={winner === m.teamA ? "text-emerald-300" : ""}>{m.scoreA}</span>
                                  <span className="text-slate-500">-</span>
                                  <span className={winner === m.teamB ? "text-emerald-300" : ""}>{m.scoreB}</span>
                                </div>
                              ) : (
                                <div className="text-xs text-slate-300">
                                  {new Date(m.date).toLocaleTimeString("fr-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                              <div className="text-right text-sm font-semibold">
                                <div className={`${winner === m.teamB ? "text-emerald-300" : "text-slate-100"}`}>
                                  {m.teamB}
                                </div>
                              </div>
                              <HexBadge name={m.teamB} imageUrl={m.teamBLogo ?? undefined} size={36} />
                            </div>
                          </>
                        );
                      })()
                    )}
                    {m.competitionType === "challenge" && (
                      <div className="w-28 flex-shrink-0 flex flex-col items-center text-sm text-slate-200 text-center">
                        <div className="text-xs text-slate-300">
                          {m.status === "planned"
                            ? new Date(m.date).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : m.status === "ongoing"
                              ? "En cours"
                              : "Terminé"}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                    <span>{m.competitionType ?? "5v5"}</span>
                    <span>{m.surface ?? "GG"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
