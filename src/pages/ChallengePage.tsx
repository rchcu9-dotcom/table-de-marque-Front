import React from "react";
import { Link } from "react-router-dom";
import { useChallengeAll } from "../hooks/useChallengeAll";
import { useTeams } from "../hooks/useTeams";
import type { ChallengeAttempt as Attempt } from "../api/challenge";
import challengeIcon from "../assets/icons/nav/challenge.png";
import { useSelectedTeam } from "../providers/SelectedTeamProvider";
import { useChallengeVitesseJ3 } from "../hooks/useChallengeVitesseJ3";
import { useChallengeJ1Momentum } from "../hooks/useChallengeJ1Momentum";
import type { VitesseJ3Player, VitesseJ3SlotId } from "../api/challenge";
import type { ChallengeJ1MomentumEntry } from "../api/challenge";

type ChallengeMomentumItem = {
  id: string;
  teamId: string;
  teamName: string;
  teamLogoUrl?: string | null;
  startAt: string;
  endAt: string;
  status: "planned" | "ongoing" | "finished";
  activityLabel: string;
};

function clampWindow<T extends { id: string }>(list: T[], targetId: string | null, desired = 3) {
  if (list.length <= desired) return list;
  const targetIndex = targetId ? list.findIndex((item) => item.id === targetId) : -1;
  const pivot = targetIndex >= 0 ? targetIndex : 0;
  let start = Math.max(0, pivot - 1);
  let end = start + desired;
  if (end > list.length) {
    end = list.length;
    start = Math.max(0, end - desired);
  }
  return list.slice(start, end);
}

function buildChallengeMomentum(entries: ChallengeJ1MomentumEntry[]): ChallengeMomentumItem[] {
  const grouped = new Map<string, ChallengeJ1MomentumEntry[]>();

  entries
    .filter((entry) => entry.slotStart)
    .forEach((entry) => {
      const teamId = (entry.teamId ?? "").trim();
      if (!teamId) return;
      const key = teamId.toLowerCase();
      const bucket = grouped.get(key) ?? [];
      bucket.push(entry);
      grouped.set(key, bucket);
    });
  return [...grouped.entries()]
    .map(([teamKey, rows]) => {
      const ordered = [...rows].sort(
        (a, b) =>
          new Date(a.slotStart).getTime() -
          new Date(b.slotStart).getTime(),
      );
      const first = ordered[0];
      const last = ordered[ordered.length - 1];
      const status: ChallengeMomentumItem["status"] = first.status;

      return {
        id: `challenge-momentum-${teamKey}`,
        teamId: first.teamId ?? teamKey,
        teamName: first.teamName ?? first.teamId ?? "Equipe",
        teamLogoUrl: first.teamLogoUrl ?? null,
        startAt: first.slotStart,
        endAt: last.slotEnd ?? first.slotEnd,
        status,
        activityLabel: "Challenge équipe",
      } satisfies ChallengeMomentumItem;
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export default function ChallengePage() {
  const { data, isLoading, isError } = useChallengeAll();
  const { data: challengeMomentumJ1 } = useChallengeJ1Momentum();
  const { data: vitesseJ3 } = useChallengeVitesseJ3();
  const { data: teams } = useTeams();
  const { selectedTeam } = useSelectedTeam();

  const [showVitesse, setShowVitesse] = React.useState(true);
  const [showTir, setShowTir] = React.useState(true);
  const [showGlisse, setShowGlisse] = React.useState(true);
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

  const evalLabel = React.useMemo(() => {
    const first = (data?.jour1 ?? [])
      .filter((a) => a.attemptDate)
      .sort((a, b) => new Date(a.attemptDate ?? 0).getTime() - new Date(b.attemptDate ?? 0).getTime())[0];
    if (!first?.attemptDate) return null;
    const d = new Date(first.attemptDate);
    return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "short" }).format(d);
  }, [data]);
  const momentumItems = React.useMemo(
    () => buildChallengeMomentum(challengeMomentumJ1 ?? []),
    [challengeMomentumJ1],
  );
  const momentumFocusId = React.useMemo(() => {
    const live = momentumItems.find((item) => item.status === "ongoing");
    if (live) return live.id;
    const lastFinished = [...momentumItems]
      .filter((item) => item.status === "finished")
      .sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime())
      .pop();
    if (lastFinished) return lastFinished.id;
    const nextPlanned = [...momentumItems]
      .filter((item) => item.status === "planned")
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
    return nextPlanned?.id ?? null;
  }, [momentumItems]);
  const visibleMomentumItems = React.useMemo(
    () => clampWindow(momentumItems, momentumFocusId, 3),
    [momentumItems, momentumFocusId],
  );

  const j3Label = React.useMemo(() => {
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

  const renderTable = (title: string, attempts: Attempt[], opts?: { highlightTop?: number; rankOnly?: boolean; hideTitle?: boolean }) => {
    const needsRanking = Boolean(opts?.highlightTop || opts?.rankOnly);
    const isVitesse = title.toLowerCase().includes("vitesse");
    const isTir = title.toLowerCase().includes("tir");
    const lower = title.toLowerCase();
    const isGlisse = lower.includes("glisse") || lower.includes("agil");
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
                alt="Glisse & Crosse"
                className="h-5 w-5 object-contain"
                loading="lazy"
              />
            ) : null}
            <span>{title}</span>
          </h2>
        )}
        {attempts.length === 0 ? (
          <p className="text-slate-300 text-xs">Aucune donnee.</p>
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
                  const rank = needsRanking ? idx + 1 : undefined;
                  const highlight = rank && opts?.highlightTop && rank <= opts.highlightTop;
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

  const applyFilters = (attempts: Attempt[], type: "vitesse" | "tir" | "glisse_crosse", opts?: { limitTop?: number }) => {
    let filtered = attempts;
    const selectedTeamId = selectedTeam?.id?.toLowerCase();
    if (selectedTeamId) {
      filtered = filtered.filter((a) => (a.equipeId ?? "").toLowerCase() === selectedTeamId);
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((a) => {
        const joueur = (a.joueurName ?? "").toLowerCase();
        const equipeId = (a.equipeId ?? "").toLowerCase();
        const equipeName = (a.equipeName ?? "").toLowerCase();
        return joueur.includes(term) || equipeId.includes(term) || equipeName.includes(term);
      });
    }
    if (!opts?.limitTop) return filtered;
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
    return [...filtered].sort(scorer).slice(0, opts.limitTop);
  };

  const vitesseSlots = React.useMemo(() => vitesseJ3?.slots ?? {}, [vitesseJ3?.slots]);
  const slotKeys = React.useMemo(() => Object.keys(vitesseSlots), [vitesseSlots]);
  const quartSlots = React.useMemo(() => {
    return slotKeys
      .filter((key) => /^QF\d+$/.test(key))
      .sort((a, b) => Number(a.slice(2)) - Number(b.slice(2))) as VitesseJ3SlotId[];
  }, [slotKeys]);
  const demiSlots = React.useMemo(() => {
    return slotKeys
      .filter((key) => /^DF\d+$/.test(key))
      .sort((a, b) => Number(a.slice(2)) - Number(b.slice(2))) as VitesseJ3SlotId[];
  }, [slotKeys]);
  const logoBaseUrl =
    (import.meta.env.VITE_TEAM_LOGO_BASE_URL as string | undefined) ?? "/assets/logos";
  const slugifyTeamName = React.useCallback((name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }, []);
  const buildLogoUrl = React.useCallback(
    (name: string) => `${logoBaseUrl}/${slugifyTeamName(name)}.png`,
    [logoBaseUrl, slugifyTeamName],
  );
  const statusBadgeClass = (status?: VitesseJ3Player["status"]) => {
    if (status === "winner") return "bg-amber-400/20 text-amber-200 border-amber-300/60";
    if (status === "finalist") return "bg-slate-800 text-slate-200 border-slate-600";
    if (status === "qualified") return "bg-emerald-500/20 text-emerald-200 border-emerald-400/60";
    return "";
  };
  const vitesseSlotsWithDefault = React.useMemo(() => {
    const empty: Record<string, VitesseJ3Player[]> = { F1: [] };
    return { ...empty, ...vitesseSlots };
  }, [vitesseSlots]);
  const statusLabel = (status?: VitesseJ3Player["status"]) => {
    if (status === "winner") return "Vainqueur";
    if (status === "finalist") return "Finale";
    if (status === "qualified") return "Qualifie";
    return "";
  };
  const renderVitesseSlot = (slotId: VitesseJ3SlotId, label: string) => {
    const players = vitesseSlotsWithDefault[slotId] ?? [];
    return (
      <div key={slotId} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="text-sm font-semibold text-white">{label}</span>
        </div>
        {players.length === 0 ? (
          <p className="text-slate-300 text-xs">Aucun joueur.</p>
        ) : (
          <ul className="space-y-2">
            {players.map((player) => {
              const equipe = teamMap.get(player.teamId.toLowerCase());
              const displayTeamName = player.teamName ?? equipe?.name ?? null;
              const fallbackLogo = displayTeamName ? buildLogoUrl(displayTeamName) : null;
              const logo = equipe?.logoUrl ?? fallbackLogo;
              const isWinner = player.status === "winner";
              return (
                <li key={player.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {logo ? (
                      <img
                        src={logo}
                        alt={displayTeamName ?? "Equipe"}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isWinner ? "text-amber-200" : "text-slate-100"}`}>
                        {player.name}
                      </p>
                      {player.teamName && (
                        <p className="text-xs text-slate-400 truncate">{player.teamName}</p>
                      )}
                    </div>
                  </div>
                  {player.status ? (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(player.status)}`}
                    >
                      {statusLabel(player.status)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  const renderFinaleList = () => {
    const players = vitesseSlotsWithDefault.F1 ?? [];
    const ordered = [...players].sort((a, b) => {
      if (a.status === "winner" && b.status !== "winner") return -1;
      if (a.status !== "winner" && b.status === "winner") return 1;
      return a.name.localeCompare(b.name);
    });
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="text-sm font-semibold text-white">Vitesse</span>
        </div>
        {ordered.length === 0 ? (
          <p className="text-slate-300 text-xs">Aucun joueur.</p>
        ) : (
          <ul className="space-y-2">
            {ordered.map((player) => {
              const equipe = teamMap.get(player.teamId.toLowerCase());
              const displayTeamName = player.teamName ?? equipe?.name ?? null;
              const fallbackLogo = displayTeamName ? buildLogoUrl(displayTeamName) : null;
              const logo = equipe?.logoUrl ?? fallbackLogo;
              const isWinner = player.status === "winner";
              return (
                <li key={player.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {logo ? (
                      <img
                        src={logo}
                        alt={displayTeamName ?? "Equipe"}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isWinner ? "text-amber-200" : "text-slate-100"}`}>
                        {player.name}
                      </p>
                      {player.teamName && (
                        <p className="text-xs text-slate-400 truncate">{player.teamName}</p>
                      )}
                    </div>
                  </div>
                  {player.status ? (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(player.status)}`}
                    >
                      {statusLabel(player.status)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  const nonEmptyQuartSlots = React.useMemo(
    () => quartSlots.filter((slot) => (vitesseSlotsWithDefault[slot] ?? []).length > 0),
    [quartSlots, vitesseSlotsWithDefault],
  );
  const nonEmptyDemiSlots = React.useMemo(
    () => demiSlots.filter((slot) => (vitesseSlotsWithDefault[slot] ?? []).length > 0),
    [demiSlots, vitesseSlotsWithDefault],
  );
  const finalePlayers = vitesseSlotsWithDefault.F1 ?? [];
  const showFinalesBlock =
    showFinale &&
    (finalePlayers.length > 0 || nonEmptyDemiSlots.length > 0 || nonEmptyQuartSlots.length > 0);

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
            <div className="flex items-center gap-2">
              <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-800/80 flex-shrink-0">
                <img src={challengeIcon} alt="Challenge" className="h-full w-full object-cover scale-150" loading="lazy" />
              </div>
              <h1 className="text-xl font-semibold text-white">Challenge</h1>
            </div>
            {selectedTeam && (
              <div className="flex items-center gap-2 text-xs text-emerald-200 pr-1">
                <span>Équipe suivie : {selectedTeam.name}</span>
                {selectedTeam.logoUrl && (
                  <img
                    src={selectedTeam.logoUrl}
                    alt={selectedTeam.name}
                    className="h-6 w-6 rounded-full object-cover border border-emerald-300/60 bg-slate-900"
                  />
                )}
              </div>
            )}
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
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-white">Momentum Challenge</h2>
                <ChallengeMomentumSlider items={visibleMomentumItems} focusId={momentumFocusId} />
              </section>

              {showFinalesBlock && (
                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-white">
                    Finales du Challenge Vitesse {j3Label ? `- ${j3Label}` : ""}
                  </h2>
                  <div className="space-y-3">
                    {finalePlayers.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-200">Vitesse</h3>
                        {renderFinaleList()}
                      </div>
                    )}
                    {nonEmptyDemiSlots.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-200">Demi Finales</h3>
                        <div className="grid gap-3 md:grid-cols-2">
                          {nonEmptyDemiSlots.map((slot) => {
                            const index = Number(slot.slice(2));
                            return renderVitesseSlot(slot, `Demi Finale ${index}`);
                          })}
                        </div>
                      </div>
                    )}
                    {nonEmptyQuartSlots.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-200">Quart de finale</h3>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          {nonEmptyQuartSlots.map((slot) => {
                            const index = Number(slot.slice(2));
                            return renderVitesseSlot(slot, `Quart de Finale ${index}`);
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {showEvaluation && (
                <section className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <h2 className="text-base font-semibold text-white">{evalLabel ? `Evaluation ${evalLabel}` : "Evaluation"}</h2>
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
                        Agilité
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
                          <Link to="/challenge/atelier/vitesse" className="text-emerald-300 hover:text-emerald-200 font-semibold">
                            Voir tout
                          </Link>
                        </div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Top 3</div>
                        {renderTable("Atelier Vitesse", applyFilters(groupByAtelier.jour1.vitesse, "vitesse", { limitTop: 3 }), {
                          hideTitle: true,
                        })}
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
                          <Link to="/challenge/atelier/tir" className="text-emerald-300 hover:text-emerald-200 font-semibold">
                            Voir tout
                          </Link>
                        </div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Top 3</div>
                        {renderTable("Atelier Tir", applyFilters(groupByAtelier.jour1.tir, "tir", { limitTop: 3 }), { hideTitle: true })}
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
                          <Link to="/challenge/atelier/glisse_crosse" className="text-emerald-300 hover:text-emerald-200 font-semibold">
                            Voir tout
                          </Link>
                        </div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Top 3</div>
                        {renderTable(
                          "Atelier Agilite",
                          applyFilters(groupByAtelier.jour1.glisse_crosse, "glisse_crosse", { limitTop: 3 }),
                          { hideTitle: true }
                        )}
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

function ChallengeMomentumSlider({
  items,
  focusId,
}: {
  items: ChallengeMomentumItem[];
  focusId: string | null;
}) {
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const cardRefs = React.useRef<Record<string, HTMLAnchorElement | null>>({});

  React.useEffect(() => {
    if (!trackRef.current || !focusId) return;
    const target = cardRefs.current[focusId];
    if (!target) return;
    const container = trackRef.current;
    const targetCenter = target.offsetLeft + target.offsetWidth / 2;
    const scrollLeft = Math.max(targetCenter - container.clientWidth / 2, 0);
    container.scrollTo({ left: scrollLeft, behavior: "smooth" });
  }, [focusId, items]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
        Aucun événement challenge à afficher.
      </div>
    );
  }

  const centerLabel = (item: ChallengeMomentumItem) => {
    if (item.status === "ongoing") return "En cours";
    if (item.status === "finished") return "Terminé";
    return new Date(item.startAt).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:snap-none"
      >
        {items.map((item) => {
          const isFocused = item.id === focusId;
          return (
            <Link
              key={item.id}
              ref={(el) => {
                cardRefs.current[item.id] = el;
              }}
              to={`/challenge/equipe/${encodeURIComponent(item.teamId)}`}
              className={`relative snap-center min-w-[220px] max-w-[240px] flex-shrink-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-inner shadow-slate-950 transition hover:-translate-y-0.5 md:min-w-0 md:max-w-none md:w-full md:flex-shrink ${
                isFocused ? "border-slate-600/80" : ""
              } ${item.status === "ongoing" ? "live-pulse-card border-amber-300/70 ring-2 ring-amber-300/40" : ""}`}
            >
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <div
                  className="absolute inset-y-0 left-0 w-2/5 opacity-20"
                  style={{
                    backgroundImage: item.teamLogoUrl ? `url(${item.teamLogoUrl})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    maskImage: "linear-gradient(90deg, rgba(0,0,0,0.8), rgba(0,0,0,0))",
                    WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0.8), rgba(0,0,0,0))",
                    transform: "skewX(-10deg)",
                    transformOrigin: "left",
                  }}
                />
              </div>
              <div className="relative">
                <div className="text-xs text-slate-400 text-center">
                  {item.activityLabel}
                </div>
                <div className={`mt-1 text-sm font-semibold text-center ${item.status === "ongoing" ? "text-amber-200" : "text-slate-100"}`}>
                  {centerLabel(item)}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 min-w-0">
                  {item.teamLogoUrl ? (
                    <img
                      src={item.teamLogoUrl}
                      alt={item.teamName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : null}
                  <span className="text-[13px] font-semibold text-slate-100 truncate">
                    {item.teamName}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}



