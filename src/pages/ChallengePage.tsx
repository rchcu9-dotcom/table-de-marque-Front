import React from "react";
import { useChallengeAll } from "../hooks/useChallengeAll";
import { useTeams } from "../hooks/useTeams";
import type { ChallengeAttempt as Attempt } from "../api/challenge";

export default function ChallengePage() {
  const { data, isLoading, isError } = useChallengeAll();
  const { data: teams } = useTeams();

  const [showTop3, setShowTop3] = React.useState(true);
  const [showVitesse, setShowVitesse] = React.useState(true);
  const [showTir, setShowTir] = React.useState(true);
  const [showGlisse, setShowGlisse] = React.useState(true);
  const [selectedPlayer, setSelectedPlayer] = React.useState<string>("");
  const [showEvaluation, setShowEvaluation] = React.useState(true);
  const [showFinale, setShowFinale] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const headerCardRef = React.useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = React.useState<{ topOffset: number; paddingTop: number }>({ topOffset: 64, paddingTop: 260 });

  const teamMap = React.useMemo(() => {
    const map = new Map<string, { name: string; logoUrl?: string | null }>();
    teams?.forEach((t) => map.set(t.id.toLowerCase(), { name: t.name, logoUrl: t.logoUrl }));
    return map;
  }, [teams]);

  const groupByAtelier = React.useMemo(() => {
    const empty = { vitesse: [] as Attempt[], tir: [] as Attempt[], glisse_crosse: [] as Attempt[] };
    if (!data) return { jour1: empty, jour3: empty };
    const reducer = (acc: typeof empty, attempt: Attempt) => {
      acc[attempt.atelierType].push(attempt);
      return acc;
    };
    return {
      jour1: data.jour1.reduce(reducer, { vitesse: [], tir: [], glisse_crosse: [] }),
      jour3: data.jour3.reduce(reducer, { vitesse: [], tir: [], glisse_crosse: [] }),
    };
  }, [data]);

  const finalesByRound = React.useMemo(() => {
    const jour3 = data?.jour3 ?? [];
    const byId = (id: string): Attempt[] => jour3.filter((a) => a.atelierId === id);
    return {
      qf: byId("finale-vitesse-qf"),
      df: byId("finale-vitesse-df"),
      finale: byId("finale-vitesse-finale"),
    };
  }, [data]);

  const uniquePlayers = React.useMemo(() => {
    return (data?.jour1 ?? [])
      .map((a) => a.joueurName)
      .filter((v, idx, arr) => arr.indexOf(v) === idx)
      .sort((a, b) => a.localeCompare(b));
  }, [data]);

  const evalLabel = React.useMemo(() => {
    const first = (data?.jour1 ?? [])
      .filter((a) => a.attemptDate)
      .sort((a, b) => new Date(a.attemptDate ?? 0).getTime() - new Date(b.attemptDate ?? 0).getTime())[0];
    if (!first?.attemptDate) return null;
    const d = new Date(first.attemptDate);
    return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "short" }).format(d);
  }, [data]);

  const finaleLabel = React.useMemo(() => {
    const first = (data?.jour3 ?? [])
      .filter((a) => a.attemptDate)
      .sort((a, b) => new Date(a.attemptDate ?? 0).getTime() - new Date(b.attemptDate ?? 0).getTime())[0];
    if (!first?.attemptDate) return null;
    const d = new Date(first.attemptDate);
    return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "short" }).format(d);
  }, [data]);

  const renderMetrics = (m: Attempt) => {
    if (m.metrics.type === "vitesse") return `${(m.metrics.tempsMs / 1000).toFixed(2)} s`;
    if (m.metrics.type === "tir") return `Points: ${m.metrics.totalPoints} (${m.metrics.tirs.join(", ")})`;
    if (m.metrics.type === "glisse_crosse") return `${(m.metrics.tempsMs / 1000).toFixed(2)} s, pénalités: ${m.metrics.penalites}`;
    return "";
  };

  const renderTable = (title: string, attempts: Attempt[], opts?: { highlightTop?: number; rankOnly?: boolean }) => {
    const needsRanking = Boolean(opts?.highlightTop || opts?.rankOnly);
    const rows = needsRanking
      ? [...attempts].sort((a, b) => {
          const va =
            a.metrics.type === "vitesse"
              ? a.metrics.tempsMs
              : a.metrics.type === "glisse_crosse"
              ? a.metrics.tempsMs
              : Number.MAX_SAFE_INTEGER;
          const vb =
            b.metrics.type === "vitesse"
              ? b.metrics.tempsMs
              : b.metrics.type === "glisse_crosse"
              ? b.metrics.tempsMs
              : Number.MAX_SAFE_INTEGER;
          return va - vb;
        })
      : attempts;

    return (
      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
        <h2 className="text-sm font-semibold mb-2 text-white">{title}</h2>
        {attempts.length === 0 ? (
          <p className="text-slate-300 text-xs">Aucune donnée.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-xs text-slate-100">
              <thead className="text-[11px] uppercase text-slate-400">
                <tr>
                  <th className="py-1 pr-3 text-left">Joueur</th>
                  <th className="py-1 text-right">Résultat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[12px]">
                {rows.map((a, idx) => {
                  const eqKey = (a.equipeId ?? "").toLowerCase();
                  const equipe = teamMap.get(eqKey);
                  const rank = needsRanking ? idx + 1 : undefined;
                  const highlight = rank && opts?.highlightTop && rank <= opts.highlightTop;
                  return (
                    <tr key={`${a.atelierId}-${a.joueurId}-${idx}`}>
                      <td className={`py-1 pr-3 font-semibold ${highlight ? "text-emerald-200" : "text-slate-100"}`}>
                        <span className="inline-flex items-center gap-2">
                          {a.equipeLogoUrl || equipe?.logoUrl ? (
                            <img
                              src={(a.equipeLogoUrl as string) || (equipe?.logoUrl as string)}
                              alt={a.equipeName || equipe?.name || "Equipe"}
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : null}
                          <span>{a.joueurName}</span>
                          {a.equipeName && <span className="text-slate-400 text-[11px]">({a.equipeId})</span>}
                        </span>
                      </td>
                      <td className={`py-1 text-right ${highlight ? "text-emerald-200" : "text-slate-100"}`}>
                        {opts?.rankOnly && rank ? `Rang ${rank}` : renderMetrics(a)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  const applyFilters = (attempts: Attempt[], type: "vitesse" | "tir" | "glisse_crosse") => {
    let filtered = attempts;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((a) => {
        const joueur = (a.joueurName ?? "").toLowerCase();
        const equipeId = (a.equipeId ?? "").toLowerCase();
        const equipeName = (a.equipeName ?? "").toLowerCase();
        return joueur.includes(term) || equipeId.includes(term) || equipeName.includes(term);
      });
    }
    if (selectedPlayer) {
      const key = selectedPlayer.toLowerCase();
      filtered = filtered.filter((a) => (a.joueurName ?? "").toLowerCase() === key);
    }
    if (!showTop3) return filtered;
    const scorer =
      type === "tir"
        ? (a: Attempt, b: Attempt) => {
            const pa = a.metrics.type === "tir" ? a.metrics.totalPoints : -Infinity;
            const pb = b.metrics.type === "tir" ? b.metrics.totalPoints : -Infinity;
            return pb - pa;
          }
        : (a: Attempt, b: Attempt) => {
            const ta =
              a.metrics.type === "vitesse"
                ? a.metrics.tempsMs
                : a.metrics.type === "glisse_crosse"
                ? a.metrics.tempsMs
                : Number.MAX_SAFE_INTEGER;
            const tb =
              b.metrics.type === "vitesse"
                ? b.metrics.tempsMs
                : b.metrics.type === "glisse_crosse"
                ? b.metrics.tempsMs
                : Number.MAX_SAFE_INTEGER;
            return ta - tb;
          };
    return [...filtered].sort(scorer).slice(0, 3);
  };

  const qfSlices = React.useMemo(() => {
    const slices: Attempt[][] = [];
    for (let i = 0; i < 8; i++) {
      slices.push(finalesByRound.qf.slice(i * 4, (i + 1) * 4));
    }
    return slices;
  }, [finalesByRound.qf]);

  const dfSlices = React.useMemo(() => {
    const slices: Attempt[][] = [];
    for (let i = 0; i < 4; i++) {
      slices.push(finalesByRound.df.slice(i * 4, (i + 1) * 4));
    }
    return slices;
  }, [finalesByRound.df]);

  React.useLayoutEffect(() => {
    const updateLayout = () => {
      const nav = document.querySelector("header");
      const navH = nav ? nav.getBoundingClientRect().height : 64;
      const headerH = headerCardRef.current ? headerCardRef.current.getBoundingClientRect().height : 180;
      const gap = 8;
      const topOffset = navH + gap;
      const paddingTop = topOffset + headerH + gap;
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
          ref={headerCardRef}
          className="max-w-6xl mx-auto rounded-xl border border-slate-800 bg-slate-900/90 p-3 flex flex-wrap items-center justify-between gap-2 shadow-md shadow-slate-950"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold">Challenge</h1>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Recherche joueur/équipe"
              className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-1 text-sm text-slate-100"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <button
              className={`rounded-full border px-3 py-1 ${showEvaluation ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/60" : "bg-slate-800 text-slate-200 border-slate-600"}`}
              onClick={() => setShowEvaluation((v) => !v)}
            >
              Évaluation
            </button>
            <button
              className={`rounded-full border px-3 py-1 ${showFinale ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/60" : "bg-slate-800 text-slate-200 border-slate-600"}`}
              onClick={() => setShowFinale((v) => !v)}
            >
              Finale
            </button>
          </div>
        </div>
      </div>

      <div
        className="absolute inset-x-4 bottom-4"
        style={{ top: `${layout.paddingTop}px`, height: `calc(100vh - ${layout.paddingTop}px - 24px)` }}
      >
        <div className="max-w-6xl mx-auto h-full rounded-xl border border-slate-800 bg-slate-900/70 p-4 overflow-y-auto space-y-4">
          {isLoading && <p className="text-slate-300 text-sm">Chargement...</p>}
          {isError && <p className="text-red-400 text-sm">Erreur lors du chargement.</p>}

          {data && (
            <>
              {showEvaluation && (
                <section className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <h2 className="text-base font-semibold text-white">{evalLabel ? `Évaluation ${evalLabel}` : "Évaluation"}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <button
                        className={`rounded-full border px-3 py-1 ${showTop3 ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/60" : "bg-slate-800 text-slate-200 border-slate-600"}`}
                        onClick={() => setShowTop3((v) => !v)}
                      >
                        Top 3
                      </button>
                      <button
                        className={`rounded-full border px-3 py-1 ${showVitesse ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/60" : "bg-slate-800 text-slate-300 border-slate-700"}`}
                        onClick={() => setShowVitesse((v) => !v)}
                      >
                        Vitesse
                      </button>
                      <button
                        className={`rounded-full border px-3 py-1 ${showTir ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/60" : "bg-slate-800 text-slate-300 border-slate-700"}`}
                        onClick={() => setShowTir((v) => !v)}
                      >
                        Tir
                      </button>
                      <button
                        className={`rounded-full border px-3 py-1 ${showGlisse ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/60" : "bg-slate-800 text-slate-300 border-slate-700"}`}
                        onClick={() => setShowGlisse((v) => !v)}
                      >
                        Glisse & Crosse
                      </button>
                      <select
                        className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-slate-100 min-w-[160px]"
                        value={selectedPlayer}
                        onChange={(e) => setSelectedPlayer(e.target.value)}
                      >
                        <option value="">Tous les joueurs</option>
                        {uniquePlayers.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {showVitesse && renderTable("Atelier Vitesse", applyFilters(groupByAtelier.jour1.vitesse, "vitesse"))}
                    {showTir && renderTable("Atelier Adresse au tir", applyFilters(groupByAtelier.jour1.tir, "tir"))}
                    {showGlisse &&
                      renderTable("Atelier Glisse & Crosse", applyFilters(groupByAtelier.jour1.glisse_crosse, "glisse_crosse"))}
                  </div>
                </section>
              )}

              {showFinale && (
                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-white">{finaleLabel ? `Finale Vitesse ${finaleLabel}` : "Finale Vitesse"}</h2>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-200">Quarts de finale</h3>
                    <div className="overflow-x-auto">
                      <div className="flex gap-3 min-w-full">
                        {qfSlices.map((slice, idx) => (
                          <div key={`qf-${idx}`} className="min-w-[240px] flex-1">
                            {renderTable(`Quart de finale ${idx + 1}`, slice, { highlightTop: 2, rankOnly: true })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-200">Demi-finales</h3>
                    <div className="overflow-x-auto">
                      <div className="flex gap-3 min-w-full">
                        {dfSlices.map((slice, idx) => (
                          <div key={`df-${idx}`} className="min-w-[240px] flex-1">
                            {renderTable(`Demi-finale ${idx + 1}`, slice, { highlightTop: 2, rankOnly: true })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-200">Finale</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {renderTable("Finale", finalesByRound.finale, { highlightTop: 1, rankOnly: true })}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
