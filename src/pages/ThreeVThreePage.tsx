import React from "react";
import threeV3Icon from "../assets/icons/nav/threev3.png";
import { useNavigate } from "react-router-dom";
import type { Match } from "../api/match";
import HexBadge from "../components/ds/HexBadge";
import { useSelectedTeam } from "../providers/SelectedTeamProvider";
import { useMatchesFiltered } from "../hooks/useMatches";

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export default function ThreeVThreePage() {
  const { selectedTeam } = useSelectedTeam();
  const { data: matches } = useMatchesFiltered({
    competitionType: "3v3",
    surface: "PG",
    teamId: selectedTeam?.id || undefined,
  });
  const navigate = useNavigate();
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const filterRef = React.useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = React.useState<{ topOffset: number; paddingTop: number }>({ topOffset: 64, paddingTop: 240 });

  const [search, setSearch] = React.useState<string>("");

  const filtered = React.useMemo(() => {
    if (!matches) return [];
    const q = normalize(search);
    const selectedId = normalize(selectedTeam?.id);
    return [...matches]
      .filter((m) => {
        if (selectedId) {
          const a = normalize(m.teamA);
          const b = normalize(m.teamB);
          if (a !== selectedId && b !== selectedId) return false;
        }
        if (q) {
          const haystacks = [m.teamA, m.teamB, m.pouleName, m.pouleCode].map(normalize);
          if (!haystacks.some((h) => h.includes(q))) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [matches, selectedTeam, search]);

  React.useEffect(() => {
    if (!filtered.length) return;
    const ongoing = filtered.find((m) => m.status === "ongoing");
    const lastFinished = [...filtered]
      .filter((m) => m.status === "finished")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .at(-1);
    const targetId = ongoing?.id ?? lastFinished?.id ?? filtered[0]?.id;
    if (targetId && itemRefs.current[targetId]) {
      itemRefs.current[targetId]?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [filtered]);

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

  React.useLayoutEffect(() => {
    const updateLayout = () => {
      const nav = document.querySelector("header");
      const navH = nav ? nav.getBoundingClientRect().height : 64;
      const filterH = filterRef.current ? filterRef.current.getBoundingClientRect().height : 200;
      const gap = 8;
      const topOffset = navH + gap;
      const paddingTop = topOffset + filterH + gap;
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
          ref={filterRef}
          className="relative overflow-hidden max-w-6xl mx-auto rounded-xl border border-slate-800 bg-slate-900/85 p-4 shadow-md shadow-slate-950"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "url(https://drive.google.com/thumbnail?id=1q2Lqml8IzvI0l348pQnRZb5te4nm4bIh&sz=w256)",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right center",
              backgroundSize: "160px",
            }}
          />
          <div className="relative flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-800/80 flex-shrink-0">
              <img src={threeV3Icon} alt="Tournoi 3v3" className="h-full w-full object-cover scale-150" loading="lazy" />
            </div>
            <h1 className="text-xl font-semibold text-white">Tournoi 3v3 FUN</h1>
          </div>
          <div className="grid gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Recherche</label>
              <input
                className="rounded-md border border-slate-700 bg-slate-950 text-slate-100 px-2 py-1 text-sm"
                type="text"
                placeholder="Equipe, poule..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute inset-x-4 bottom-4"
        style={{ top: `${layout.paddingTop}px`, height: `calc(100vh - ${layout.paddingTop}px - 24px)` }}
      >
        <div className="max-w-6xl mx-auto h-full rounded-xl border border-slate-800 bg-slate-900/60 p-4 overflow-y-auto pb-24 md:pb-6">
          {filtered.length === 0 ? (
            <p className="text-slate-300 text-sm">Aucun match à afficher.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((m) => {
                const winner = computeWinner(m);
                return (
                  <div
                    key={m.id}
                    ref={(el) => {
                      itemRefs.current[m.id] = el;
                    }}
                    className={`relative overflow-hidden rounded-lg border px-3 py-2 flex flex-col gap-2 ${buildCardClasses(m.status)}`}
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
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{m.pouleName || m.pouleCode || "Poule"}</span>
                      <span>
                        {new Date(m.date).toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <HexBadge name={m.teamA} imageUrl={m.teamALogo ?? undefined} size={36} />
                        <div className="text-sm font-semibold">
                          <div className={`${winner === m.teamA ? "text-emerald-300" : "text-slate-100"}`}>{m.teamA}</div>
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
                          <div className={`${winner === m.teamB ? "text-emerald-300" : "text-slate-100"}`}>{m.teamB}</div>
                        </div>
                        <HexBadge name={m.teamB} imageUrl={m.teamBLogo ?? undefined} size={36} />
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/matches/${m.id}`)}
                      className="absolute inset-0"
                      aria-label={`Ouvrir le match ${m.teamA} vs ${m.teamB}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
