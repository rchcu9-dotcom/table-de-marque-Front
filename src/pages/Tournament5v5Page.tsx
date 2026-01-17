/* eslint-disable react-hooks/set-state-in-effect, react-hooks/immutability, @typescript-eslint/no-explicit-any */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMatchesFiltered, useMomentumMatches } from "../hooks/useMatches";
import { useClassement } from "../hooks/useClassement";
import type { Match } from "../api/match";
import { Link, useNavigate } from "react-router-dom";
import HorizontalMatchSlider from "../components/collections/HorizontalMatchSlider";
import fiveV5Icon from "../assets/icons/nav/fivev5.png";
import { useSelectedTeam } from "../providers/SelectedTeamProvider";

const byDateAsc = (a: Match, b: Match) => new Date(a.date).getTime() - new Date(b.date).getTime();

const BRASSAGE = [
  { code: "A", title: "Sam - Brassage Poule A", phase: "Brassage" },
  { code: "B", title: "Sam - Brassage Poule B", phase: "Brassage" },
  { code: "C", title: "Sam - Brassage Poule C", phase: "Brassage" },
  { code: "D", title: "Sam - Brassage Poule D", phase: "Brassage" },
];

const QUALIF = [
  { code: "Alpha", title: "Dim - Tournoi Or - Alpha", phase: "Qualification" },
  { code: "Beta", title: "Dim - Tournoi Or - Beta", phase: "Qualification" },
  { code: "Gamma", title: "Dim - Tournoi Argent - Gamma", phase: "Qualification" },
  { code: "Delta", title: "Dim - Tournoi Argent - Delta", phase: "Qualification" },
];

const FINALES = [
  { code: "Or1", title: "Lun - Carré Or 1", phase: "Finales" },
  { code: "Argent1", title: "Lun - Carré Argent 1", phase: "Finales" },
  { code: "Or5", title: "Lun - Carré Or 5", phase: "Finales" },
  { code: "Argent5", title: "Lun - Carré Argent 5", phase: "Finales" },
];

type HomeState = "avant" | "pendant" | "apres";

function pickStateByDate(matches: Match[], nowMs: number): HomeState {
  if (matches.length === 0) return "avant";
  if (matches.some((m) => m.status === "ongoing")) return "pendant";
  const sorted = [...matches].sort(byDateAsc);
  const first = new Date(sorted[0].date).getTime();
  const last = new Date(sorted[sorted.length - 1].date).getTime();
  if (nowMs < first) return "avant";
  if (nowMs > last) return "apres";
  return "pendant";
}

function momentumTitle(state: HomeState) {
  if (state === "avant") return "PrÊts à jouer !";
  if (state === "pendant") return "Ça joue !";
  return "Clap de fin !";
}

export default function Tournament5v5Page() {
  const navigate = useNavigate();
  const { selectedTeam } = useSelectedTeam();
  const [nowMs, setNowMs] = React.useState<number | null>(null);
  const { data: momentum5v5 } = useMomentumMatches({
    competitionType: "5v5",
    surface: "GG",
    teamId: selectedTeam?.id,
  });
  const { data: matches5v5 } = useMatchesFiltered({
    competitionType: "5v5",
    surface: "GG",
    teamId: selectedTeam?.id,
  });
  const [showBrassage, setShowBrassage] = React.useState(true);
  const [showQualif, setShowQualif] = React.useState(true);
  const [showFinales, setShowFinales] = React.useState(true);
  const [layout, setLayout] = useState<{ topOffset: number; paddingTop: number }>({ topOffset: 64, paddingTop: 320 });
  const filtersInitialized = React.useRef(false);
  const nowValue = nowMs ?? 0;
  useEffect(() => {
    setNowMs(Date.now());
  }, []);
  const momentumSorted = React.useMemo(
    () => (momentum5v5 ? [...momentum5v5].sort(byDateAsc) : []),
    [momentum5v5],
  );
  const momentumFocus = React.useMemo(() => {
    if (momentumSorted.length === 0) return null;
    const ongoing = momentumSorted.filter((m) => m.status === "ongoing");
    if (ongoing.length > 0) return ongoing[ongoing.length - 1];
    const now = nowMs ?? 0;
    const next = momentumSorted.find((m) => m.status === "planned" || new Date(m.date).getTime() > now);
    return next ?? momentumSorted[momentumSorted.length - 1];
  }, [momentumSorted, nowMs]);
  const momentumWindow = React.useMemo(() => {
    if (momentumSorted.length <= 3) return momentumSorted;
    const targetId = momentumFocus?.id ?? null;
    const targetIdx = targetId ? momentumSorted.findIndex((m) => m.id === targetId) : 0;
    let start = Math.max(0, targetIdx - 1);
    let end = start + 3;
    if (end > momentumSorted.length) {
      end = momentumSorted.length;
      start = Math.max(0, end - 3);
    }
    return momentumSorted.slice(start, end);
  }, [momentumSorted, momentumFocus]);
  const momentumAlign = React.useMemo(() => {
    if (momentumSorted.length === 0) return "center";
    const allFinished = momentumSorted.every((m) => m.status === "finished");
    return allFinished ? "end" : "center";
  }, [momentumSorted]);
  const state = React.useMemo(() => pickStateByDate(momentumSorted, nowValue), [momentumSorted, nowValue]);
  const momentumLabel = React.useMemo(() => momentumTitle(state), [state]);
  const highlightTeams = React.useMemo(() => {
    const current = momentum5v5?.find((m) => m.status === "ongoing");
    if (!current) return new Set<string>();
    return new Set([current.teamA, current.teamB]);
  }, [momentum5v5]);
  const highlightPoule = React.useMemo(() => {
    const current = momentum5v5?.find((m) => m.status === "ongoing");
    return current?.pouleCode;
  }, [momentum5v5]);
  const targetMatchId = React.useMemo(() => {
    if (!momentum5v5?.length) return null;
    const sorted = [...momentum5v5].sort(byDateAsc);
    const target =
      sorted.find((m) => m.status === "ongoing") ||
      sorted.find((m) => m.status === "planned") ||
      sorted[0];
    return target?.id ?? null;
  }, [momentum5v5]);
  const listRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const matchRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolled = useRef(false);

  useEffect(() => {
    hasAutoScrolled.current = false;
  }, [targetMatchId]);

  useEffect(() => {
    if (!targetMatchId || hasAutoScrolled.current) return;
    const targetEl = matchRefs.current[targetMatchId];
    if (!targetEl || !scrollAreaRef.current) return;
    requestAnimationFrame(() => {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    });
    hasAutoScrolled.current = true;
  }, [targetMatchId, matches5v5]);

  useEffect(() => {
    if (filtersInitialized.current) return;
    if (!momentum5v5 || momentum5v5.length === 0) return;
    const sorted = [...momentum5v5].sort(byDateAsc);
    const refMatch =
      sorted.find((m) => m.status === "ongoing") ||
      sorted.find((m) => m.status === "planned") ||
      sorted[Math.floor(sorted.length / 2)];
    const phase = (refMatch?.phase ?? "").toLowerCase();
    if (phase) {
      setShowBrassage(phase === "brassage");
      setShowQualif(phase === "qualification");
      setShowFinales(phase === "finales");
      filtersInitialized.current = true;
    }
  }, [momentum5v5]);

  const topBlockRef = useRef<HTMLDivElement | null>(null);

  const recomputeLayout = React.useCallback(() => {
    const header = document.querySelector("header");
    const headerHeight = header ? header.getBoundingClientRect().height : 64;
    const topHeight = topBlockRef.current ? topBlockRef.current.getBoundingClientRect().height : 220;
    const gap = 8;
    const topOffset = headerHeight + gap;
    const paddingTop = topOffset + topHeight + gap;
    setLayout({ topOffset, paddingTop });
  }, []);

  useLayoutEffect(() => {
    recomputeLayout();
    window.addEventListener("resize", recomputeLayout);
    return () => window.removeEventListener("resize", recomputeLayout);
  }, [recomputeLayout]);

  useEffect(() => {
    recomputeLayout();
  }, [recomputeLayout, momentum5v5?.length, showBrassage, showQualif, showFinales]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div
        className="absolute left-0 right-0 px-4"
        style={{ top: `${layout.topOffset}px` }}
      >
        <div className="max-w-6xl mx-auto space-y-3" ref={topBlockRef}>
          <section className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-md shadow-slate-950">
            <div
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "url(https://drive.google.com/thumbnail?id=1vIehJkzRKfVUUxP86EzX7jaTpD2Wr4AO&sz=w256)",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right center",
                backgroundSize: "160px",
              }}
            />
            <div className="flex flex-col items-start gap-3 relative">
              <div className="flex items-center gap-2">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-800/80 flex-shrink-0">
                  <img src={fiveV5Icon} alt="Tournoi 5v5" className="h-full w-full object-cover scale-150" loading="lazy" />
                </div>
                <h2 className="text-lg font-semibold text-white">Tournoi 5v5</h2>
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
              <div className="flex items-center gap-2 text-xs font-semibold flex-wrap">
                <button
                  className={`rounded-full border px-3 py-1 ${
                    showBrassage
                      ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/60"
                      : "bg-slate-800 text-slate-200 border-slate-600"
                  }`}
                  onClick={() => setShowBrassage((v) => !v)}
                >
                  Sam - Brassage
                </button>
                <button
                  className={`rounded-full border px-3 py-1 ${
                    showQualif
                      ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/60"
                      : "bg-slate-800 text-slate-200 border-slate-600"
                  }`}
                  onClick={() => setShowQualif((v) => !v)}
                >
                  Dim - Qualification
                </button>
                <button
                  className={`rounded-full border px-3 py-1 ${
                    showFinales
                      ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/60"
                      : "bg-slate-800 text-slate-200 border-slate-600"
                  }`}
                  onClick={() => setShowFinales((v) => !v)}
                >
                  Lun - Finales
                </button>
              </div>
            </div>
          </section>
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-md shadow-slate-950" data-testid="tournament-momentum">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">{momentumLabel}</h3>
            </div>
            <HorizontalMatchSlider
              matches={momentumWindow}
              currentMatchId={momentumFocus?.id}
              onSelect={(id) => navigate(`/matches/${id}`)}
              testIdPrefix="tournament-momentum-card"
              focusTestId="tournament-momentum-focus"
              withDiagonalBg
              focusAlign={momentumAlign}
            />
          </section>
        </div>
      </div>

      <div
        className="absolute inset-x-4 bottom-4"
        style={{
          top: `${layout.paddingTop}px`,
          height: `calc(100vh - ${layout.paddingTop}px - 24px)`,
        }}
      >
        <div className="max-w-6xl mx-auto h-full overflow-y-auto space-y-6 pb-24 md:pb-6" ref={scrollAreaRef}>
          {showBrassage && (
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-lg font-semibold mb-3">Classements Sam (Brassage)</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {BRASSAGE.map((p) => (
                  <ClassementCard
                    key={p.code}
                    code={p.code}
                    phase={p.phase}
                    title={p.title}
                    refMap={listRefs}
                    matchRefMap={matchRefs}
                    highlightTeams={highlightPoule === p.code ? highlightTeams : undefined}
                    matches={matches5v5}
                    selectedTeamId={selectedTeam?.id}
                    onSelectMatch={(id) => navigate(`/matches/${id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {showQualif && (
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-lg font-semibold mb-3">Classements Dim (Qualification)</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {QUALIF.map((p) => (
                  <ClassementCard
                    key={p.code}
                    code={p.code}
                    phase={p.phase}
                    title={p.title}
                    refMap={listRefs}
                    matchRefMap={matchRefs}
                    highlightTeams={highlightPoule === p.code ? highlightTeams : undefined}
                    matches={matches5v5}
                    selectedTeamId={selectedTeam?.id}
                    onSelectMatch={(id) => navigate(`/matches/${id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {showFinales && (
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-lg font-semibold mb-3">Classements Lun (Finales)</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {FINALES.map((p) => (
                  <ClassementCard
                    key={p.code}
                    code={p.code}
                    phase={p.phase}
                    title={p.title}
                    refMap={listRefs}
                    matchRefMap={matchRefs}
                    highlightTeams={highlightPoule === p.code ? highlightTeams : undefined}
                    hidePoints
                    matches={matches5v5}
                    selectedTeamId={selectedTeam?.id}
                    onSelectMatch={(id) => navigate(`/matches/${id}`)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

type ClassementCardProps = {
  code: string;
  phase?: string;
  title?: string;
  refMap?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  matchRefMap?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  highlightTeams?: Set<string>;
  hidePoints?: boolean;
  matches?: Match[];
  onSelectMatch?: (id: string) => void;
  selectedTeamId?: string;
};

function ClassementCard({
  code,
  phase,
  title,
  refMap,
  matchRefMap,
  highlightTeams,
  hidePoints,
  matches,
  onSelectMatch,
  selectedTeamId,
}: ClassementCardProps & { selectedTeamId?: string }) {
  const { data, isLoading, isError } = useClassement(code, phase);

  if (isLoading) return <div className="text-sm text-slate-300">Chargement poule {code}…</div>;
  if (isError || !data) return <div className="text-sm text-red-300">Erreur poule {code}</div>;

  const pouleMatches =
    matches
      ?.filter((m) => {
        const codeLower = code.toLowerCase();
        const nameLower = (data.pouleName || "").toLowerCase();
        const mCode = (m.pouleCode || "").toLowerCase();
        const mName = (m.pouleName || "").toLowerCase();
        return mCode === codeLower || mName === nameLower || mName === codeLower;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) ?? [];

  if (selectedTeamId) {
    const inPoule = data.equipes.some((eq) => (eq.id ?? "").toLowerCase() === selectedTeamId.toLowerCase());
    if (!inPoule) return null;
  }

  return (
    <div
      className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"
      ref={(el) => {
        if (refMap) {
          refMap.current[code] = el;
        }
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title ?? data.pouleName ?? `Poule ${code}`}</h3>
        {data.phase && <span className="text-xs text-slate-300">{data.phase}</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-slate-900/80 backdrop-blur">
            <tr className="text-left text-slate-300">
              <th className="py-1 pr-2">#</th>
              <th className="py-1 pr-2">Équipe</th>
              {!hidePoints && <th className="py-1 pr-2 text-right">Pts</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.equipes.map((eq) => {
              const highlight = highlightTeams?.has(eq.id);
              const displayName = (eq as any).shortName ?? (eq as any).nameShort ?? eq.id ?? eq.name;
              return (
                <tr key={eq.id} className={`text-slate-100 ${highlight ? "bg-amber-500/10 animate-pulse" : ""}`}>
                  <td className="py-1 pr-2">{eq.rang}</td>
                  <td className="py-1 pr-2">
                    <Link to={`/teams/${eq.id}`} className="flex items-center gap-2 hover:underline">
                      <Logo name={displayName} url={eq.logoUrl} size={28} />
                      <span>{displayName}</span>
                    </Link>
                  </td>
                  {!hidePoints && <td className="py-1 pr-2 text-right font-semibold">{eq.points}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pouleMatches.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {pouleMatches.map((m) => (
            <SmallMatchCard key={m.id} match={m} onSelect={onSelectMatch} refMap={matchRefMap} />
          ))}
        </div>
      )}
    </div>
  );
}

function Logo({ name, url, size = 32 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="rounded-full object-cover bg-slate-800"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-slate-800 text-slate-200 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function SmallMatchCard({
  match,
  onSelect,
  refMap,
}: {
  match: Match;
  onSelect?: (id: string) => void;
  refMap?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  const d = new Date(match.date);
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const isScored =
    (match.status === "finished" || match.status === "ongoing") &&
    match.scoreA !== null &&
    match.scoreB !== null;

  const winnerClass = (side: "A" | "B") => {
    if (match.status !== "finished" || match.scoreA === null || match.scoreB === null) return "text-slate-200";
    if (match.scoreA === match.scoreB) return "text-slate-200";
    const win = side === "A" ? match.scoreA > match.scoreB : match.scoreB > match.scoreA;
    return win ? "text-emerald-300" : "text-slate-300";
  };

  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-slate-900/80 px-3 py-1 shadow-inner shadow-slate-950 cursor-pointer ${
        match.status === "ongoing"
          ? "border-amber-400 live-pulse-card ring-2 ring-amber-300/60"
          : "border-slate-800"
      }`}
      ref={(el) => {
        if (refMap) {
          refMap.current[match.id] = el;
        }
      }}
      onClick={() => onSelect?.(match.id)}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg opacity-25">
        <div
          className="absolute inset-y-0 left-0 w-1/3"
          style={{
            backgroundImage: match.teamALogo ? `url(${match.teamALogo})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage: "linear-gradient(90deg, rgba(0,0,0,0.75), rgba(0,0,0,0))",
            WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0.75), rgba(0,0,0,0))",
            transform: "skewX(-10deg)",
            transformOrigin: "left",
          }}
        />
        <div className="absolute inset-y-0 left-1/3 right-1/3" />
        <div
          className="absolute inset-y-0 right-0 w-1/3"
          style={{
            backgroundImage: match.teamBLogo ? `url(${match.teamBLogo})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage: "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.75))",
            WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.75))",
            transform: "skewX(-10deg)",
            transformOrigin: "right",
          }}
        />
      </div>

      <div className="relative flex items-center gap-2">
        <div className="flex items-center gap-1 min-w-0 justify-start flex-1">
          {match.teamALogo && (
            <img
              src={match.teamALogo}
              alt={match.teamA}
              className="h-5 w-5 rounded-full object-cover"
            />
          )}
          <span className={`text-[12px] leading-tight font-normal truncate block whitespace-nowrap ${winnerClass("A")}`}>
            {match.teamA}
          </span>
        </div>
        <div className="flex-none w-20 text-center">
          {isScored ? (
            <span className="text-[12px] leading-tight font-semibold text-slate-100 whitespace-nowrap">
              <span className={winnerClass("A")}>{match.scoreA}</span>
              <span className="mx-1 text-slate-400">-</span>
              <span className={winnerClass("B")}>{match.scoreB}</span>
            </span>
          ) : (
            <span className="text-[12px] leading-tight font-semibold text-slate-100 whitespace-nowrap">{time}</span>
          )}
        </div>
        <div className="flex items-center gap-1 justify-end min-w-0 flex-1">
          <span
            className={`text-[12px] leading-tight font-normal truncate text-right block whitespace-nowrap ${winnerClass("B")}`}
          >
            {match.teamB}
          </span>
          {match.teamBLogo && (
            <img
              src={match.teamBLogo}
              alt={match.teamB}
              className="h-5 w-5 rounded-full object-cover"
            />
          )}
        </div>
      </div>
    </div>
  );
}


