import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMatches } from "../api/match";
import type { Match } from "../api/match";
import { useTeams } from "../hooks/useTeams";
import { useMeals } from "../hooks/useMeals";
import { useSelectedTeam } from "../providers/SelectedTeamProvider";
import homeIcon from "../assets/icons/nav/home.png";
import icon5v5 from "../assets/icons/nav/fivev5.png";
import icon3v3 from "../assets/icons/nav/threev3.png";
import iconChallenge from "../assets/icons/nav/challenge.png";

type HomeState = "avant" | "pendant" | "apres";

type Triplet = { last: Match | null; live: Match | null; next: Match | null };

function getNowMs() {
  return Date.now();
}

function useLiveMatches() {
  const queryClient = useQueryClient();
  const [isDegraded, setIsDegraded] = React.useState(false);

  React.useEffect(() => {
    const onError = () => setIsDegraded(true);
    const onOpen = () => setIsDegraded(false);
    window.addEventListener("match-stream:error", onError);
    window.addEventListener("match-stream:open", onOpen);
    return () => {
      window.removeEventListener("match-stream:error", onError);
      window.removeEventListener("match-stream:open", onOpen);
    };
  }, []);

  const query = useQuery<Match[]>({
    queryKey: ["matches", isDegraded],
    queryFn: () => fetchMatches(),
    staleTime: 20_000,
    refetchInterval: isDegraded ? 30_000 : false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const matches = query.data ?? (queryClient.getQueryData<Match[]>(["matches"]) ?? []);

  return { matches, isDegraded, isLoading: query.isLoading };
}

function byDateAsc(a: Match, b: Match) {
  return new Date(a.date).getTime() - new Date(b.date).getTime();
}

function filterByCompetition(matches: Match[], competition: "5v5" | "3v3" | "challenge") {
  return matches.filter((m) => (m.competitionType ?? "5v5") === competition);
}

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

function dayIndex(nowMs: number, matches: Match[]) {
  const sorted = [...matches].sort(byDateAsc);
  const start = sorted[0] ? new Date(sorted[0].date).getTime() : nowMs;
  const diffDays = Math.floor((nowMs - start) / 86_400_000);
  return Math.max(1, diffDays + 1);
}

function tripletForCompetition(matches: Match[], competition: "5v5" | "3v3" | "challenge", nowMs: number): Triplet {
  const list = filterByCompetition(matches, competition).sort(byDateAsc);
  const liveCandidates = list.filter((m) => m.status === "ongoing");
  const live = liveCandidates.length > 0 ? liveCandidates[liveCandidates.length - 1] : null;
  const finished = list.filter((m) => m.status === "finished" && new Date(m.date).getTime() <= nowMs);
  const last = finished.length > 0 ? finished[finished.length - 1] : null;
  const future = list.filter((m) => {
    const ts = new Date(m.date).getTime();
    if (live && m.id === live.id) return false;
    if (m.status === "finished") return false;
    return ts >= nowMs;
  });
  const next = future.length > 0 ? future[0] : null;
  return { last, live, next };
}

function upcomingMatches(matches: Match[], competition: "5v5" | "3v3" | "challenge", nowMs: number) {
  return filterByCompetition(matches, competition)
    .filter((m) => new Date(m.date).getTime() > nowMs)
    .sort(byDateAsc);
}

function recentMatches(matches: Match[], competition: "5v5" | "3v3" | "challenge", nowMs: number) {
  return filterByCompetition(matches, competition)
    .filter((m) => new Date(m.date).getTime() <= nowMs)
    .sort(byDateAsc);
}

function clampWindow(list: Match[], targetId: string | null, desired = 3) {
  if (list.length === 0) return [];
  if (list.length <= desired) return list;
  const targetIdx =
    targetId && list.findIndex((m) => m.id === targetId) >= 0 ? list.findIndex((m) => m.id === targetId) : 0;
  let start = Math.max(0, targetIdx - 1);
  let end = start + desired;
  if (end > list.length) {
    end = list.length;
    start = Math.max(0, end - desired);
  }
  return list.slice(start, end);
}

function liveCenteredOrder(triplet: Triplet, all: Match[], nowMs: number) {
  const sorted = [...all].sort(byDateAsc);
  const liveId = triplet.live?.id ?? null;
  const plannedIdx = sorted.findIndex((m) => m.status === "planned" || new Date(m.date).getTime() > nowMs);
  const targetId =
    liveId ??
    (plannedIdx >= 0 ? sorted[plannedIdx].id : null) ??
    (sorted.length > 0 ? sorted[0].id : null);
  return clampWindow(sorted, targetId, 3);
}

function autoIndexForList(list: Match[], liveId: string | null, nowMs: number) {
  if (liveId) {
    const idx = list.findIndex((m) => m.id === liveId);
    if (idx >= 0) return idx;
  }
  const plannedIdx = list.findIndex((m) => m.status === "planned" || new Date(m.date).getTime() > nowMs);
  if (plannedIdx >= 0) return plannedIdx;
  return 0;
}

function smallGlaceCompetition(day: number): "3v3" | "challenge" {
  if (day === 2) return "3v3";
  return "challenge";
}

function segmentForTeam(matches: Match[], teamId: string, competitionFilter?: "5v5" | "3v3" | "challenge") {
  if (!teamId) {
    return { ongoing: null, lastFinished: null, nextPlanned: null };
  }
  const filtered = matches.filter(
    (m) =>
      (m.teamA.toLowerCase() === teamId.toLowerCase() || m.teamB.toLowerCase() === teamId.toLowerCase()) &&
      (!competitionFilter || (m.competitionType ?? "5v5") === competitionFilter),
  );
  const sorted = [...filtered].sort(byDateAsc);
  const ongoing = sorted.find((m) => m.status === "ongoing") ?? null;
  const finished = sorted.filter((m) => m.status === "finished");
  const lastFinished = finished[finished.length - 1] ?? null;
  const planned = sorted.filter((m) => m.status === "planned");
  const nextPlanned = planned[0] ?? null;
  return { ongoing, lastFinished, nextPlanned };
}

function CompactLine({
  title,
  icon,
  items,
  testId,
  cardTestIdPrefix,
  focusTestId,
  autoFocusIndex = 0,
  autoFocusAlign = "center",
  focusId,
  focusTone,
  onSelect,
}: {
  title: string;
  icon: string;
  items: Array<{ label?: string; match: Match | null }>;
  testId: string;
  cardTestIdPrefix?: string;
  focusTestId?: string;
  autoFocusIndex?: number;
  autoFocusAlign?: "center" | "end";
  focusId?: string | null;
  focusTone?: "blue";
  onSelect?: (id: string) => void;
}) {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const shouldAutoFocus = typeof autoFocusIndex === "number" && autoFocusIndex >= 0;

  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-autofocus="true"]');
    if (el?.scrollIntoView) {
      const align = el.dataset.autofocusAlign === "end" ? "end" : "center";
      el.scrollIntoView({ inline: align, block: "nearest", behavior: "smooth" });
    }
  }, [items]);

  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="flex items-center gap-2">
        <img src={icon} alt={title} className="h-8 w-8 rounded-md bg-slate-800 object-cover" loading="lazy" />
        <p className="text-sm font-semibold text-slate-100">{title}</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory" ref={listRef}>
        {items
          .filter(({ match }) => !!match)
          .map(({ label, match }, index) => (
            <CompactMatchCard
              key={`${testId}-${index}-${match?.id ?? "na"}`}
              match={match!}
              label={label}
              testId={
                cardTestIdPrefix && match?.id
                  ? `${cardTestIdPrefix}-${match.id}`
                  : `${testId}-item-${index}`
              }
              autoFocus={shouldAutoFocus && index === autoFocusIndex}
              autoFocusAlign={autoFocusAlign}
              isFocused={!!focusId && match?.id === focusId}
              focusTone={focusTone}
              focusTestId={focusTestId}
              onSelect={onSelect}
            />
          ))}
      </div>
    </div>
  );
}

function TodayBlock({
  matches,
  selectedTeamId,
  focusTeamName,
  onSelect,
  smallGlaceLabel,
  smallGlaceType,
  mealOfDay,
}: {
  matches: Match[];
  selectedTeamId: string;
  focusTeamName: string;
  onSelect: (id: string) => void;
  smallGlaceLabel: string;
  smallGlaceType: "3v3" | "challenge";
  mealOfDay?: { dateTime: string | null; message?: string | null } | null;
}) {
  const segments5v5 = segmentForTeam(matches, selectedTeamId, "5v5");
  const segmentsAlt = segmentForTeam(matches, selectedTeamId, smallGlaceType);
  const lastCard = segments5v5.lastFinished ? (
    <InlineMatchCard
      key="last"
      match={segments5v5.lastFinished}
      focusTeam={focusTeamName}
      onSelect={onSelect}
      testId="home-today-last"
    />
  ) : (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300" data-testid="home-today-last">
      Aucun match terminé.
    </div>
  );

  const nextCard = segments5v5.nextPlanned || segments5v5.ongoing ? (
    <InlineMatchCard
      key="next"
      match={segments5v5.ongoing ?? segments5v5.nextPlanned!}
      focusTeam={focusTeamName}
      onSelect={onSelect}
      testId="home-today-next"
    />
  ) : (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300" data-testid="home-today-next">
      Aucun match planifié.
    </div>
  );

  const altTarget = segmentsAlt.ongoing ?? segmentsAlt.nextPlanned ?? segmentsAlt.lastFinished;
  const altCard = altTarget ? (
    <InlineMatchCard
      key="alt"
      match={altTarget}
      focusTeam={focusTeamName}
      onSelect={onSelect}
      testId="home-today-alt"
    />
  ) : (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300" data-testid="home-today-alt">
      Aucun événement.
    </div>
  );

  const mealLabel = (() => {
    if (mealOfDay?.dateTime) {
      return new Date(mealOfDay.dateTime).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return mealOfDay?.message ?? "Repas indisponible";
  })();

  return (
    <div className="space-y-3" data-testid="home-today">
      <div className="flex items-center gap-2 text-xs uppercase text-slate-400">
        <img src={icon5v5} alt="5v5" className="h-4 w-4 object-contain" />
        <span>Prochain match</span>
      </div>
      {nextCard}
      <div className="flex items-center gap-2 text-xs uppercase text-slate-400">
        <img src={icon5v5} alt="5v5" className="h-4 w-4 object-contain" />
        <span>Dernier match</span>
      </div>
      {lastCard}
      <div className="flex items-center gap-2 text-xs uppercase text-slate-400">
        <img src={smallGlaceType === "3v3" ? icon3v3 : iconChallenge} alt={smallGlaceLabel} className="h-4 w-4 object-contain" />
        <span>{smallGlaceLabel}</span>
      </div>
      {altCard}
      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 flex items-center justify-between">
          <span className="text-xs uppercase text-slate-400">Repas du jour</span>
          <span className="font-semibold">{mealLabel}</span>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 flex items-center justify-between">
          <span className="text-xs uppercase text-slate-400">Vestiaire</span>
          <span className="font-semibold">Vestiaire A (mock)</span>
        </div>
      </div>
    </div>
  );
}

function TeamGrid({
  teams,
  onSelect,
}: {
  teams: { id: string; name: string; logoUrl?: string | null }[];
  onSelect: (team: { id: string; name: string; logoUrl?: string | null }) => void;
}) {
  if (!teams || teams.length === 0) {
    return <p className="text-slate-300 text-sm">Aucune équipe.</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {teams.map((team) => (
        <button
          type="button"
          onClick={() => onSelect(team)}
          key={team.id}
          className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900/70 aspect-[8/3] flex items-end p-3 shadow-inner hover:-translate-y-0.5 transition"
          data-testid={`home-teams-card-${team.id}`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: team.logoUrl ? `url(${team.logoUrl})` : undefined,
              opacity: team.logoUrl ? 0.25 : 0,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
          <div className="relative flex items-center gap-2">
            <Logo name={team.name} url={team.logoUrl} size={48} />
            <span className="text-sm font-semibold text-white drop-shadow">{team.id}</span>
          </div>
        </button>
      ))}
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

function CompactMatchCard({
  match,
  label,
  testId,
  autoFocus,
  autoFocusAlign,
  isFocused,
  focusTone,
  focusTestId,
  onSelect,
}: {
  match: Match;
  label?: string;
  testId: string;
  autoFocus?: boolean;
  autoFocusAlign?: "center" | "end";
  isFocused?: boolean;
  focusTone?: "blue";
  focusTestId?: string;
  onSelect?: (id: string) => void;
}) {
  const d = new Date(match.date);
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const isChallenge = (match.competitionType ?? "").toLowerCase() === "challenge";
  const isScored =
    !isChallenge &&
    (match.status === "finished" || match.status === "ongoing") &&
    match.scoreA !== null &&
    match.scoreB !== null;
  const hasWinner =
    match.status === "finished" &&
    match.scoreA !== null &&
    match.scoreB !== null &&
    match.scoreA !== match.scoreB;
  const winnerSide = hasWinner ? (match.scoreA! > match.scoreB! ? "A" : "B") : null;
  const subtitle = (() => {
    if (isChallenge) {
      if (match.status === "ongoing") return "En cours";
      if (match.status === "finished") return "Terminé";
      return time;
    }
    if (isScored) {
      return (
        <span className="inline-flex items-center gap-1">
          <span className={hasWinner && winnerSide === "A" ? "text-emerald-300" : ""}>{match.scoreA}</span>
          <span className="text-slate-400">-</span>
          <span className={hasWinner && winnerSide === "B" ? "text-emerald-300" : ""}>{match.scoreB}</span>
        </span>
      );
    }
    return time;
  })();
  const isLive = match.status === "ongoing";
  const showTeamB = !isChallenge;
  const focusClass =
    isFocused && focusTone === "blue" && !isLive ? "border-sky-400 ring-2 ring-sky-300/70" : "";
  return (
    <div
      className={`relative overflow-hidden rounded-lg border px-4 py-3 text-sm text-slate-100 shadow-inner min-w-[220px] sm:min-w-[240px] max-w-[320px] flex-[0_0_78vw] md:flex-[0_0_280px] snap-center cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:bg-slate-900/80 hover:shadow-lg active:scale-[0.99] ${
        isLive ? "border-amber-400 ring-2 ring-amber-300/60 live-pulse-card" : "border-slate-800"
      } ${focusClass} bg-slate-950/80`}
      data-testid={testId}
      data-autofocus={autoFocus ? "true" : "false"}
      data-autofocus-align={autoFocus ? autoFocusAlign : undefined}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : -1}
      onClick={() => onSelect?.(match.id)}
    >
      {isFocused && focusTestId ? <span data-testid={focusTestId} /> : null}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
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
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {match.teamALogo && <img src={match.teamALogo} alt={match.teamA} className="h-5 w-5 rounded-full object-cover" />}
          <span
            className={`text-[12px] font-semibold truncate ${
              hasWinner && winnerSide === "A" ? "text-emerald-300" : ""
            }`}
          >
            {match.teamA}
          </span>
        </div>
        <div className="flex flex-col items-center min-w-[52px]">
          {label && <span className="text-[10px] uppercase text-slate-400">{label}</span>}
          <span className={`text-[12px] font-semibold ${isLive ? "text-amber-200" : "text-slate-100"}`}>
            {subtitle}
          </span>
        </div>
        {showTeamB && (
          <div className="flex items-center gap-2 min-w-0 justify-end">
            <span
              className={`text-[12px] font-semibold truncate text-right ${
                hasWinner && winnerSide === "B" ? "text-emerald-300" : ""
              }`}
            >
              {match.teamB}
            </span>
            {match.teamBLogo && <img src={match.teamBLogo} alt={match.teamB} className="h-5 w-5 rounded-full object-cover" />}
          </div>
        )}
      </div>
    </div>
  );
}

function InlineMatchCard({
  match,
  focusTeam,
  onSelect,
  testId,
}: {
  match: Match;
  focusTeam: string;
  onSelect: (id: string) => void;
  testId?: string;
}) {
  const d = new Date(match.date);
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const isChallenge = (match.competitionType ?? "").toLowerCase() === "challenge";
  const isScored =
    !isChallenge &&
    (match.status === "finished" || match.status === "ongoing") &&
    match.scoreA !== null &&
    match.scoreB !== null;

  const winnerClass = (side: "A" | "B") => {
    if (match.status !== "finished" || match.scoreA === null || match.scoreB === null) return "text-slate-200";
    if (match.scoreA === match.scoreB) return "text-slate-200";
    const win = side === "A" ? match.scoreA > match.scoreB : match.scoreB > match.scoreA;
    return win ? "text-emerald-300" : "text-slate-300";
  };

  const focusHighlight = (team: string) => (team.toLowerCase() === focusTeam.toLowerCase() ? "font-semibold" : "");

  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-slate-900/80 px-3 py-1 shadow-inner shadow-slate-950 cursor-pointer transition ${
        match.status === "ongoing" ? "border-amber-400 ring-2 ring-amber-300/60" : "border-slate-800"
      }`}
      onClick={() => onSelect(match.id)}
      data-testid={testId}
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
          {match.teamALogo && <img src={match.teamALogo} alt={match.teamA} className="h-5 w-5 rounded-full object-cover" />}
          <span
            className={`text-[12px] leading-tight font-normal truncate block whitespace-nowrap ${winnerClass("A")} ${focusHighlight(match.teamA)}`}
          >
            {match.teamA}
          </span>
        </div>
        <div className="flex-none w-20 text-center">
          {isChallenge ? (
            <span className="text-[12px] leading-tight font-semibold text-slate-100 whitespace-nowrap">
              {match.status === "ongoing" ? "En cours" : match.status === "finished" ? "Terminé" : time}
            </span>
          ) : isScored ? (
            <span className="text-[12px] leading-tight font-semibold text-slate-100 whitespace-nowrap">
              <span className={winnerClass("A")}>{match.scoreA}</span>
              <span className="mx-1 text-slate-400">-</span>
              <span className={winnerClass("B")}>{match.scoreB}</span>
            </span>
          ) : (
            <span className="text-[12px] leading-tight font-semibold text-slate-100 whitespace-nowrap">{time}</span>
          )}
        </div>
        {!isChallenge && (
          <div className="flex items-center gap-1 justify-end min-w-0 flex-1">
            <span
              className={`text-[12px] leading-tight font-normal truncate text-right block whitespace-nowrap ${winnerClass("B")} ${focusHighlight(match.teamB)}`}
            >
              {match.teamB}
            </span>
            {match.teamBLogo && <img src={match.teamBLogo} alt={match.teamB} className="h-5 w-5 rounded-full object-cover" />}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { data: teams } = useTeams();
  const { selectedTeam } = useSelectedTeam();
  const { matches, isDegraded } = useLiveMatches();
  const { data: meals } = useMeals();
  const nowMs = getNowMs();
  const [layout, setLayout] = React.useState<{ topOffset: number; paddingTop: number }>({
    topOffset: 64,
    paddingTop: 320,
  });
  const topBlockRef = React.useRef<HTMLDivElement | null>(null);

  const recomputeLayout = React.useCallback(() => {
    const header = document.querySelector("header");
    const headerHeight = header ? header.getBoundingClientRect().height : 64;
    const topHeight = topBlockRef.current ? topBlockRef.current.getBoundingClientRect().height : 220;
    const gap = 8;
    const topOffset = headerHeight + gap;
    const paddingTop = topOffset + topHeight + gap;
    setLayout({ topOffset, paddingTop });
  }, []);

  React.useLayoutEffect(() => {
    recomputeLayout();
    window.addEventListener("resize", recomputeLayout);
    return () => window.removeEventListener("resize", recomputeLayout);
  }, [recomputeLayout]);

  const state = React.useMemo(() => pickStateByDate(matches, nowMs), [matches, nowMs]);
  const day = React.useMemo(() => dayIndex(nowMs, matches), [matches, nowMs]);
  const smallGlaceType = React.useMemo(() => smallGlaceCompetition(day), [day]);
  const smallGlaceLabel = smallGlaceType === "3v3" ? "3v3" : "Challenge";

  const triplet5v5 = React.useMemo(() => tripletForCompetition(matches, "5v5", nowMs), [matches, nowMs]);
  const tripletSmallGlace = React.useMemo(
    () => tripletForCompetition(matches, smallGlaceType, nowMs),
    [matches, smallGlaceType, nowMs],
  );
  const ordered5v5 = React.useMemo(() => liveCenteredOrder(triplet5v5, filterByCompetition(matches, "5v5"), nowMs), [triplet5v5, matches, nowMs]);
  const orderedSmallGlace = React.useMemo(
    () => liveCenteredOrder(tripletSmallGlace, filterByCompetition(matches, smallGlaceType), nowMs),
    [tripletSmallGlace, matches, smallGlaceType, nowMs],
  );
  const autoIndex5v5 = React.useMemo(
    () => autoIndexForList(ordered5v5, triplet5v5.live?.id ?? null, nowMs),
    [ordered5v5, triplet5v5.live, nowMs],
  );
  const autoIndexSmallGlace = React.useMemo(
    () => autoIndexForList(orderedSmallGlace, tripletSmallGlace.live?.id ?? null, nowMs),
    [orderedSmallGlace, tripletSmallGlace.live, nowMs],
  );
  const focusId5v5 = React.useMemo(
    () => (ordered5v5[autoIndex5v5]?.id ? ordered5v5[autoIndex5v5].id : null),
    [ordered5v5, autoIndex5v5],
  );
  const focusIdSmallGlace = React.useMemo(
    () => (orderedSmallGlace[autoIndexSmallGlace]?.id ? orderedSmallGlace[autoIndexSmallGlace].id : null),
    [orderedSmallGlace, autoIndexSmallGlace],
  );
  const countdown = React.useMemo(() => {
    const next = [...matches].sort(byDateAsc).find((m) => new Date(m.date).getTime() > nowMs);
    if (!next) return null;
    const diff = new Date(next.date).getTime() - nowMs;
    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${days}j ${hours.toString().padStart(2, "0")}h ${minutes
      .toString()
      .padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  }, [matches, nowMs]);

  const hero = React.useMemo(() => {
    const subtitle =
      selectedTeam?.name ??
      (state === "avant"
        ? countdown
          ? `Début dans ${countdown}`
          : "Tournoi à venir"
        : state === "pendant"
          ? "Tournoi en cours"
          : "Tournoi terminé");
    return {
      title: "Accueil",
      subtitle,
    };
  }, [countdown, selectedTeam?.name, state]);
  const momentumTitle = React.useMemo(() => {
    if (state === "avant") return "Prêts à jouer !";
    if (state === "pendant") return "Ça joue !";
    return "Clap de fin !";
  }, [state]);

  const beforeUpcoming5v5 = React.useMemo(() => upcomingMatches(matches, "5v5", nowMs).slice(0, 3), [matches, nowMs]);
  const beforeUpcomingChallenge = React.useMemo(
    () => upcomingMatches(matches, "challenge", nowMs).slice(0, 3),
    [matches, nowMs],
  );
  const beforeFocus5v5 = React.useMemo(() => beforeUpcoming5v5[0]?.id ?? null, [beforeUpcoming5v5]);
  const beforeFocusChallenge = React.useMemo(
    () => beforeUpcomingChallenge[0]?.id ?? null,
    [beforeUpcomingChallenge],
  );
  const afterRecent5v5 = React.useMemo(
    () => recentMatches(matches, "5v5", nowMs).slice(-3),
    [matches, nowMs],
  );
  const focusIdApres5v5 = React.useMemo(
    () => (afterRecent5v5.length > 0 ? afterRecent5v5[afterRecent5v5.length - 1].id : null),
    [afterRecent5v5],
  );
  const afterChallengeWinners = React.useMemo(
    () => recentMatches(matches, "challenge", nowMs).slice(-3).reverse(),
    [matches, nowMs],
  );
  const afterFocusChallenge = React.useMemo(
    () => (afterChallengeWinners[0]?.id ? afterChallengeWinners[0].id : null),
    [afterChallengeWinners],
  );

  React.useEffect(() => {
    recomputeLayout();
  }, [
    recomputeLayout,
    isDegraded,
    state,
    countdown,
    selectedTeam?.id,
    selectedTeam?.name,
    selectedTeam?.logoUrl,
    meals?.mealOfDay?.dateTime,
    meals?.mealOfDay?.message,
  ]);

  return (
    <div className="fixed inset-0 overflow-hidden" data-testid="home-page">
      <div className="absolute left-0 right-0 px-4" style={{ top: `${layout.topOffset}px` }}>
        <div className="max-w-6xl mx-auto" ref={topBlockRef}>
          <section className="rounded-xl border border-slate-800 bg-slate-950/80 backdrop-blur px-4 py-3 shadow-lg shadow-slate-900/40">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-800/80 flex-shrink-0">
            <img src={homeIcon} alt="Accueil" className="h-full w-full object-cover scale-150" loading="lazy" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-white" data-testid="home-hero-title">
              {hero.title}
            </h1>
            <p className="text-sm text-slate-300">{hero.subtitle}</p>
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
          </div>
        </div>
        {isDegraded && (
          <div
            className="mt-2 rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
            data-testid="home-degraded-banner"
          >
            Mode dégradé (reconnexion en cours) – actualisation toutes les 30s.
          </div>
        )}
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
        <div className="max-w-6xl mx-auto h-full overflow-y-auto space-y-6 pb-24 md:pb-6">
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4" data-testid="home-now">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{momentumTitle}</h2>
            </div>
            <div data-testid="home-momentum" className="space-y-4">
              {state === "avant" && (
                <>
                  <CompactLine
                    title="5v5"
                    icon={icon5v5}
                    items={beforeUpcoming5v5.map((m) => ({ match: m }))}
                    testId="home-now-5v5"
                    cardTestIdPrefix="home-momentum-card"
                    focusId={beforeFocus5v5}
                    focusTestId="home-momentum-focus"
                    autoFocusIndex={0}
                    onSelect={(id) => navigate(`/matches/${id}`)}
                  />
                  <CompactLine
                    title="Challenge"
                    icon={iconChallenge}
                    items={beforeUpcomingChallenge.map((m) => ({ match: m }))}
                    testId="home-challenge-compact"
                    cardTestIdPrefix="home-momentum-card"
                    focusId={beforeFocusChallenge}
                    focusTestId="home-momentum-focus"
                    onSelect={(id) => navigate(`/matches/${id}`)}
                  />
                </>
              )}
              {state === "pendant" && (
                <>
                  <CompactLine
                    title="5v5"
                    icon={icon5v5}
                    items={ordered5v5.map((m) => ({ match: m }))}
                    testId="home-now-5v5"
                    cardTestIdPrefix="home-momentum-card"
                    focusId={focusId5v5}
                    focusTestId="home-momentum-focus"
                    autoFocusIndex={autoIndex5v5}
                    onSelect={(id) => navigate(`/matches/${id}`)}
                  />
                  <CompactLine
                    title={smallGlaceLabel}
                    icon={smallGlaceType === "3v3" ? icon3v3 : iconChallenge}
                    items={orderedSmallGlace.map((m) => ({ match: m }))}
                    testId="home-now-smallglace"
                    cardTestIdPrefix="home-momentum-card"
                    focusId={focusIdSmallGlace}
                    focusTestId="home-momentum-focus"
                    autoFocusIndex={autoIndexSmallGlace}
                    onSelect={(id) => navigate(`/matches/${id}`)}
                  />
                </>
              )}
              {state === "apres" && (
                <>
                  <CompactLine
                    title="5v5"
                    icon={icon5v5}
                    items={afterRecent5v5.map((m) => ({ match: m }))}
                    testId="home-now-5v5"
                    cardTestIdPrefix="home-momentum-card"
                    autoFocusIndex={afterRecent5v5.length > 0 ? afterRecent5v5.length - 1 : -1}
                    autoFocusAlign="end"
                    focusId={focusIdApres5v5}
                    focusTestId="home-momentum-focus"
                    focusTone="blue"
                    onSelect={(id) => navigate(`/matches/${id}`)}
                  />
                  <CompactLine
                    title="Challenge"
                    icon={iconChallenge}
                    items={afterChallengeWinners.map((m) => ({
                      match: m,
                    }))}
                    testId="home-challenge-compact"
                    cardTestIdPrefix="home-momentum-card"
                    focusId={afterFocusChallenge}
                    focusTestId="home-momentum-focus"
                    onSelect={(id) => navigate(`/matches/${id}`)}
                  />
                </>
              )}
            </div>
          </section>

        {selectedTeam && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3" data-testid="home-today-wrapper">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo name={selectedTeam.name} url={selectedTeam.logoUrl} size={32} />
              <button
                type="button"
                className="text-lg font-semibold text-white hover:text-emerald-200"
                onClick={() => navigate(`/teams/${encodeURIComponent(selectedTeam.id)}`)}
              >
                Aujourd'hui · {selectedTeam.name}
              </button>
            </div>
            <button
              type="button"
              className="text-xs text-emerald-200 hover:text-emerald-100"
              onClick={() => navigate("/planning")}
            >
              Voir le planning
            </button>
          </div>
          <TodayBlock
            matches={matches}
            selectedTeamId={selectedTeam.id}
            focusTeamName={selectedTeam.name}
            onSelect={(id) => navigate(`/matches/${id}`)}
            smallGlaceLabel={smallGlaceLabel}
            smallGlaceType={smallGlaceType}
            mealOfDay={meals?.mealOfDay ?? null}
          />
        </section>
      )}

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3" data-testid="home-teams-grid">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Équipes</h2>
            {selectedTeam?.name && <span className="text-xs text-emerald-200">Équipe suivie : {selectedTeam.name}</span>}
          </div>
          <TeamGrid
            teams={(teams ?? []).slice(0, 16)}
            onSelect={(team) => navigate(`/teams/${encodeURIComponent(team.id)}`)}
          />
        </section>
      </div>
    </div>
    </div>
  );
}
