import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useChallengeByEquipe } from "../hooks/useChallengeByEquipe";
import { useChallengeJ1Momentum } from "../hooks/useChallengeJ1Momentum";
import { useTeams } from "../hooks/useTeams";
import type { ChallengeAttempt as Attempt } from "../api/challenge";
import challengeIcon from "../assets/icons/nav/challenge.png";

type TeamInfo = {
  id: string;
  name: string;
  logoUrl?: string | null;
  nameShort?: string;
  shortName?: string;
};

export default function ChallengeEquipePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useChallengeByEquipe(teamId);
  const { data: challengeJ1Momentum } = useChallengeJ1Momentum();
  const { data: teams, refetch: refetchTeams } = useTeams();

  const [showVitesse, setShowVitesse] = React.useState(true);
  const [showTir, setShowTir] = React.useState(true);
  const [showGlisse, setShowGlisse] = React.useState(true);
  const [showEvaluation, setShowEvaluation] = React.useState(true);
  const [showFinale, setShowFinale] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const headerCardRef = React.useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = React.useState<{ topOffset: number; paddingTop: number }>({
    topOffset: 64,
    paddingTop: 260,
  });
  React.useEffect(() => {
    void refetchTeams();
  }, [refetchTeams]);

  const team = React.useMemo<TeamInfo | null>(() => {
    if (!teams || !teamId) return null;
    const needle = teamId.toLowerCase();
    const found = teams.find(
      (t) => t.id.toLowerCase() === needle || t.name.toLowerCase() === needle,
    ) as TeamInfo | undefined;
    return found ?? null;
  }, [teams, teamId]);

  const teamLabel = React.useMemo(() => {
    const shortName = team?.nameShort || team?.shortName;
    return shortName || team?.name || data?.equipeName || teamId || "Equipe";
  }, [team, data?.equipeName, teamId]);
  const challengeStatus = React.useMemo(() => {
    const entries = challengeJ1Momentum ?? [];
    if (entries.length === 0) return null;

    const keys = new Set(
      [
        teamId,
        team?.id,
        team?.name,
        teamLabel,
        data?.equipeName,
      ]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim().toLowerCase()),
    );

    const found = entries.find((entry) => {
      const idKey = entry.teamId.trim().toLowerCase();
      const nameKey = entry.teamName.trim().toLowerCase();
      return keys.has(idKey) || keys.has(nameKey);
    });

    return found?.status ?? null;
  }, [challengeJ1Momentum, data?.equipeName, team?.id, team?.name, teamId, teamLabel]);

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

  const hasFinales = React.useMemo(() => {
    return finalesByRound.qf.length > 0 || finalesByRound.df.length > 0 || finalesByRound.finale.length > 0;
  }, [finalesByRound]);

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
    if (m.metrics.type === "glisse_crosse") return `${(m.metrics.tempsMs / 1000).toFixed(2)} s, penalites: ${m.metrics.penalites}`;
    return "";
  };

  const renderTable = (title: string, attempts: Attempt[], opts?: { highlightTop?: number; hideTitle?: boolean }) => {
    const isVitesse = title.toLowerCase().includes("vitesse");
    const isTir = title.toLowerCase().includes("tir");
    const lower = title.toLowerCase();
    const isGlisse = lower.includes("glisse") || lower.includes("agil");
    const rows = [...attempts].sort((a, b) => {
      if (a.metrics.type === "tir" && b.metrics.type === "tir") {
        return b.metrics.totalPoints - a.metrics.totalPoints;
      }
      if (a.metrics.type === "vitesse" && b.metrics.type === "vitesse") {
        return a.metrics.tempsMs - b.metrics.tempsMs;
      }
      if (a.metrics.type === "glisse_crosse" && b.metrics.type === "glisse_crosse") {
        return a.metrics.tempsMs - b.metrics.tempsMs;
      }
      return 0;
    });

    return (
      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
        {!opts?.hideTitle && (
          <h2 className="text-sm font-semibold mb-2 text-white flex items-center gap-2">
            {isVitesse ? (
              <img
                src="https://drive.google.com/thumbnail?id=1rg6fHxVUWLBB5N5B27lTDW8gp0Pl9bxj&sz=w64"
                alt="Vitesse"
                className="h-5 w-5 object-contain"
                loading="lazy"
              />
            ) : null}
            {isTir ? (
              <img
                src="https://drive.google.com/thumbnail?id=1Q5PEpy7rvatLWo9thWj9TFuyjJqEFqRx&sz=w64"
                alt="Adresse au tir"
                className="h-5 w-5 object-contain"
                loading="lazy"
              />
            ) : null}
            {isGlisse ? (
              <img
                src="https://drive.google.com/thumbnail?id=188Qsqx1zJv0WdYqJzrVCCIN-ufK6MkQe&sz=w64"
                alt="Agilite"
                className="h-5 w-5 object-contain"
                loading="lazy"
              />
            ) : null}
            <span>{title}</span>
          </h2>
        )}
        {attempts.length === 0 ? (
          <p className="text-slate-300 text-xs">Pas de joueur.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-xs text-slate-100" data-testid="challenge-attempts">
              <thead className="text-[11px] uppercase text-slate-400">
                <tr>
                  <th className="py-1 pr-3 text-left">Joueur</th>
                  <th className="py-1 text-right">Resultat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[12px]">
                {rows.map((a, idx) => {
                  const eqKey = (a.equipeId ?? "").toLowerCase();
                  const equipe = teamMap.get(eqKey);
                  const rank = idx + 1;
                  const highlight = opts?.highlightTop && rank <= opts.highlightTop;
                  return (
                    <tr
                      key={`${a.atelierId}-${a.joueurId}-${idx}`}
                      data-testid={`challenge-attempt-${a.atelierId}-${a.joueurId}-${idx}`}
                    >
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
                        {renderMetrics(a)}
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

  const applyFilters = (attempts: Attempt[]) => {
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
    return filtered;
  };

  const qfSlices = React.useMemo(() => {
    const slices: Attempt[][] = [];
    for (let i = 0; i < 8; i++) {
      const slice = finalesByRound.qf.slice(i * 4, (i + 1) * 4);
      slices.push(slice);
    }
    return slices;
  }, [finalesByRound.qf]);

  const dfSlices = React.useMemo(() => {
    const slices: Attempt[][] = [];
    for (let i = 0; i < 4; i++) {
      const slice = finalesByRound.df.slice(i * 4, (i + 1) * 4);
      slices.push(slice);
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

  if (!teamId) {
    return (
      <div className="p-6 text-slate-100 space-y-4">
        <p>Equipe introuvable.</p>
        <button className="text-sky-400 underline" onClick={() => navigate(-1)} type="button">
          Retour
        </button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-slate-100 space-y-4">
        <p>Equipe introuvable.</p>
        <button className="text-sky-400 underline" onClick={() => navigate(-1)} type="button">
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute left-0 right-0 px-4" style={{ top: `${layout.topOffset}px` }}>
        <div
          ref={headerCardRef}
          className="relative overflow-hidden max-w-6xl mx-auto rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-md shadow-slate-950"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "url(https://drive.google.com/thumbnail?id=1BlOlsgBPdgob1SgoN3HXcs-PEcUM8TIh&sz=w256)",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right center",
              backgroundSize: "160px",
            }}
          />
          <div className="relative flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-slate-200 text-sm hover:border-slate-500"
                onClick={() => navigate(-1)}
                type="button"
              >
                Retour
              </button>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Link to="/" className="hover:text-white">
                  Accueil
                </Link>
                <span>{">"}</span>
                <Link to="/challenge" className="hover:text-white">
                  Challenge
                </Link>
                <span>{">"}</span>
                <span className="text-white font-semibold">{teamLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-800/80 flex-shrink-0">
                {team?.logoUrl ? (
                  <img src={team.logoUrl} alt={teamLabel} className="h-full w-full object-cover" />
                ) : (
                  <img src={challengeIcon} alt="Challenge" className="h-full w-full object-cover scale-150" loading="lazy" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">{teamLabel}</h1>
                {challengeStatus === "ongoing" ? <span className="text-xs text-amber-200">En cours</span> : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 max-w-xl">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Recherche joueur/equipe"
                className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 w-full"
              />
              <div className="flex items-center gap-2 text-xs font-semibold flex-wrap">
                <button
                  className={`rounded-full border px-3 py-1 ${showEvaluation ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/60" : "bg-slate-800 text-slate-200 border-slate-600"}`}
                  onClick={() => setShowEvaluation((v) => !v)}
                >
                  Evaluation
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
        </div>
      </div>

      <div
        className="absolute inset-x-4 bottom-4"
        style={{ top: `${layout.paddingTop}px`, height: `calc(100vh - ${layout.paddingTop}px - 24px)` }}
      >
        <div className="max-w-6xl mx-auto h-full rounded-xl border border-slate-800 bg-slate-900/70 p-4 overflow-y-auto space-y-4 pb-24 md:pb-6">
          {isLoading && <p className="text-slate-300 text-sm">Chargement...</p>}
          {isError && <p className="text-red-400 text-sm">Erreur lors du chargement.</p>}

          {data && (
            <>
              {showFinale && hasFinales && (
                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-white">
                    {finaleLabel ? `Finales du Challenge Vitesse - ${finaleLabel}` : "Finales du Challenge Vitesse"}
                  </h2>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-200">Vitesse</h3>
                    {finalesByRound.finale.length > 0 ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {renderTable("Finale", finalesByRound.finale)}
                      </div>
                    ) : (
                      <p className="text-slate-300 text-xs">Pas de joueur.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-200">Demi Finales</h3>
                    <div className="overflow-x-auto">
                      <div className="flex gap-3 min-w-full">
                        {dfSlices.map((slice, idx) => (
                          <div key={`df-${idx}`} className="min-w-[240px] flex-1">
                            {renderTable(`Demi Finale ${idx + 1}`, slice)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-200">Quart de finale</h3>
                    <div className="overflow-x-auto">
                      <div className="flex gap-3 min-w-full">
                        {qfSlices.map((slice, idx) => (
                          <div key={`qf-${idx}`} className="min-w-[240px] flex-1">
                            {renderTable(`Quart de Finale ${idx + 1}`, slice)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {showEvaluation && (
                <section className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <h2 className="text-base font-semibold text-white">
                        {evalLabel ? `Evaluation ${evalLabel}` : "Evaluation"}
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
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
                        Agilite
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {showVitesse && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-200">
                          <div className="flex items-center gap-2">
                            <img
                              src="https://drive.google.com/thumbnail?id=1rg6fHxVUWLBB5N5B27lTDW8gp0Pl9bxj&sz=w64"
                              alt="Vitesse"
                              className="h-5 w-5 object-contain"
                            />
                            <span className="text-sm font-semibold text-white">Atelier Vitesse</span>
                          </div>
                        </div>
                        {renderTable("Atelier Vitesse", applyFilters(groupByAtelier.jour1.vitesse), { hideTitle: true })}
                      </div>
                    )}
                    {showTir && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-200">
                          <div className="flex items-center gap-2">
                            <img
                              src="https://drive.google.com/thumbnail?id=1Q5PEpy7rvatLWo9thWj9TFuyjJqEFqRx&sz=w64"
                              alt="Tir"
                              className="h-5 w-5 object-contain"
                            />
                            <span className="text-sm font-semibold text-white">Atelier Tir</span>
                          </div>
                        </div>
                        {renderTable("Atelier Tir", applyFilters(groupByAtelier.jour1.tir), { hideTitle: true })}
                      </div>
                    )}
                    {showGlisse && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-200">
                          <div className="flex items-center gap-2">
                            <img
                              src="https://drive.google.com/thumbnail?id=188Qsqx1zJv0WdYqJzrVCCIN-ufK6MkQe&sz=w64"
                              alt="Agilite"
                              className="h-5 w-5 object-contain"
                            />
                            <span className="text-sm font-semibold text-white">Atelier Agilite</span>
                          </div>
                        </div>
                        {renderTable("Atelier Agilite", applyFilters(groupByAtelier.jour1.glisse_crosse), { hideTitle: true })}
                      </div>
                    )}
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
