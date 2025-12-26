import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMatchesFiltered, useMomentumMatches } from "../hooks/useMatches";
import { useClassement } from "../hooks/useClassement";
import type { Match } from "../api/match";
import { Link, useNavigate } from "react-router-dom";
import HorizontalMatchSlider from "../components/collections/HorizontalMatchSlider";
import HexBadge from "../components/ds/HexBadge";

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

export default function Tournament5v5Page() {
  const navigate = useNavigate();
  const { data: momentum5v5 } = useMomentumMatches({ competitionType: "5v5", surface: "GG" });
  const { data: matches5v5 } = useMatchesFiltered({ competitionType: "5v5" });
  const [showBrassage, setShowBrassage] = React.useState(true);
  const [showQualif, setShowQualif] = React.useState(true);
  const [showFinales, setShowFinales] = React.useState(true);
  const [layout, setLayout] = useState<{ topOffset: number; paddingTop: number }>({ topOffset: 64, paddingTop: 320 });
  const filtersInitialized = React.useRef(false);
  const highlightTeams = React.useMemo(() => {
    const current = momentum5v5?.find((m) => m.status === "ongoing");
    if (!current) return new Set<string>();
    return new Set([current.teamA, current.teamB]);
  }, [momentum5v5]);
  const highlightPoule = React.useMemo(() => {
    const current = momentum5v5?.find((m) => m.status === "ongoing");
    return current?.pouleCode;
  }, [momentum5v5]);
  const listRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!momentum5v5?.length) return;
    const current = momentum5v5.find((m) => m.status === "ongoing");
    const targetCode = current?.pouleCode;
    if (targetCode && listRefs.current[targetCode] && scrollAreaRef.current) {
      const el = listRefs.current[targetCode];
      const container = scrollAreaRef.current;
      // calc position inside scroll container, clamp to avoid jumping to bottom
      const rawOffset =
        el.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop -
        12; // small padding
      const maxOffset = Math.max(0, container.scrollHeight - container.clientHeight);
      const offset = Math.min(Math.max(rawOffset, 0), maxOffset);
      requestAnimationFrame(() => {
        container.scrollTo({ top: offset, behavior: "smooth" });
      });
    }
  }, [momentum5v5]);

  useEffect(() => {
    if (filtersInitialized.current) return;
    if (!momentum5v5 || momentum5v5.length === 0) return;
    const center = momentum5v5[Math.floor(momentum5v5.length / 2)];
    const phase = (center?.phase ?? "").toLowerCase();
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
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-md shadow-slate-950">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-white">Tournoi 5v5</h2>
              <div className="flex items-center gap-2 text-xs font-semibold">
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
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-md shadow-slate-950">
            <HorizontalMatchSlider
              matches={momentum5v5?.slice(0, 3) ?? []}
              currentMatchId={momentum5v5 && momentum5v5[1]?.id}
              onSelect={(id) => navigate(`/matches/${id}`)}
              testIdPrefix="tournament-momentum"
              withDiagonalBg
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
        <div className="max-w-6xl mx-auto h-full overflow-y-auto space-y-6" ref={scrollAreaRef}>
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
                    highlightTeams={highlightPoule === p.code ? highlightTeams : undefined}
                    matches={matches5v5}
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
                    highlightTeams={highlightPoule === p.code ? highlightTeams : undefined}
                    matches={matches5v5}
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
                    highlightTeams={highlightPoule === p.code ? highlightTeams : undefined}
                    hidePoints
                    matches={matches5v5}
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
  highlightTeams?: Set<string>;
  hidePoints?: boolean;
  matches?: Match[];
  onSelectMatch?: (id: string) => void;
};

function ClassementCard({ code, phase, title, refMap, highlightTeams, hidePoints, matches, onSelectMatch }: ClassementCardProps) {
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
              return (
                <tr key={eq.id} className={`text-slate-100 ${highlight ? "bg-amber-500/10 animate-pulse" : ""}`}>
                  <td className="py-1 pr-2">{eq.rang}</td>
                  <td className="py-1 pr-2">
                    <Link to={`/teams/${eq.id}`} className="flex items-center gap-2 hover:underline">
                      <Logo name={eq.name} url={eq.logoUrl} size={28} />
                      <span>{eq.name}</span>
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
            <SmallMatchCard key={m.id} match={m} onSelect={onSelectMatch} />
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

function SmallMatchCard({ match, onSelect }: { match: Match; onSelect?: (id: string) => void }) {
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

function StatusBadge({ status }: { status: Match["status"] }) {
  const map: Record<Match["status"], string> = {
    ongoing: "En cours",
    planned: "À venir",
    finished: "Terminé",
    deleted: "Annulé",
  };
  const color =
    status === "ongoing"
      ? "bg-amber-500/20 text-amber-300 border-amber-400/60"
      : status === "planned"
        ? "bg-slate-700/50 text-slate-100 border-slate-500/60"
        : "bg-emerald-500/20 text-emerald-200 border-emerald-400/60";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${color}`}>
      {map[status]}
    </span>
  );
}
