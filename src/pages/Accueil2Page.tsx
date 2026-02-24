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
import { getLiveCommentary } from "./utils/homeCommentary";

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

function pickStateByDate(matches: Match[]): HomeState {
  if (matches.length === 0) return "avant";
  if (matches.some((m) => m.status === "ongoing")) return "pendant";
  if (matches.every((m) => m.status === "finished")) return "apres";
  if (matches.some((m) => m.status === "finished") && matches.some((m) => m.status === "planned")) return "pendant";
  return "avant";
}

function dayIndex(nowMs: number, matches: Match[]) {
  const sorted = [...matches].sort(byDateAsc);
  const start = sorted[0] ? new Date(sorted[0].date).getTime() : nowMs;
  const diffDays = Math.floor((nowMs - start) / 86_400_000);
  return Math.max(1, diffDays + 1);
}

function tripletForCompetition(matches: Match[], competition: "5v5" | "3v3" | "challenge"): Triplet {
  const list = filterByCompetition(matches, competition).sort(byDateAsc);
  const liveCandidates = list.filter((m) => m.status === "ongoing");
  const live = liveCandidates.length > 0 ? liveCandidates[liveCandidates.length - 1] : null;
  const finished = list.filter((m) => m.status === "finished");
  const last = finished.length > 0 ? finished[finished.length - 1] : null;
  const planned = list.filter((m) => m.status === "planned");
  const next = planned.length > 0 ? planned[0] : null;
  return { last, live, next };
}

function upcomingMatches(matches: Match[], competition: "5v5" | "3v3" | "challenge") {
  return filterByCompetition(matches, competition)
    .filter((m) => m.status === "planned")
    .sort(byDateAsc);
}

function recentMatches(matches: Match[], competition: "5v5" | "3v3" | "challenge") {
  return filterByCompetition(matches, competition)
    .filter((m) => m.status === "finished")
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

function liveCenteredOrder(triplet: Triplet, all: Match[]) {
  const sorted = [...all].sort(byDateAsc);
  const liveId = triplet.live?.id ?? null;
  const nextId = triplet.next?.id ?? null;
  const lastId = triplet.last?.id ?? null;
  const targetId =
    liveId ??
    nextId ??
    lastId ??
    (sorted.length > 0 ? sorted[0].id : null);
  return clampWindow(sorted, targetId, 3);
}

function autoIndexForList(list: Match[], focusId: string | null) {
  if (focusId) {
    const idx = list.findIndex((m) => m.id === focusId);
    if (idx >= 0) return idx;
  }
  const plannedIdx = list.findIndex((m) => m.status === "planned");
  if (plannedIdx >= 0) return plannedIdx;
  return 0;
}

function focusIndexForTourniquet(list: Match[]) {
  if (list.length === 0) return -1;
  const ongoingIdx = list.findIndex((m) => m.status === "ongoing");
  if (ongoingIdx >= 0) return ongoingIdx;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i].status === "finished") return i;
  }
  const plannedIdx = list.findIndex((m) => m.status === "planned");
  if (plannedIdx >= 0) return plannedIdx;
  return 0;
}

function kiosqueTripletWindowWithOscillation(
  list: Match[],
  focusIndex: number,
  oscillationStep: number,
) {
  if (list.length === 0 || focusIndex < 0 || focusIndex >= list.length) return [];
  if (list.length <= 3) return list;

  const poolStart = Math.max(0, focusIndex - 2);
  const poolEnd = Math.min(list.length - 1, focusIndex + 2);
  const pool = list.slice(poolStart, poolEnd + 1);
  const focusInPool = focusIndex - poolStart;

  if (pool.length <= 3) return pool;

  // Focus position oscillation in the visible triplet: right -> center -> left -> center.
  const desiredPositionCycle = [2, 1, 0, 1];
  const desiredFocusPosition = desiredPositionCycle[oscillationStep % desiredPositionCycle.length];

  let tripletStart = focusInPool - desiredFocusPosition;
  if (tripletStart < 0) tripletStart = 0;
  if (tripletStart + 3 > pool.length) tripletStart = pool.length - 3;

  return pool.slice(tripletStart, tripletStart + 3);
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
  gridJustify = false,
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
  gridJustify?: boolean;
  onSelect?: (id: string) => void;
}) {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const shouldAutoFocus = typeof autoFocusIndex === "number" && autoFocusIndex >= 0;
  const filteredItems = items.filter(({ match }) => !!match);
  const containerClass = gridJustify
    ? `grid gap-3 grid-cols-1 ${
        filteredItems.length <= 1
          ? "md:grid-cols-1"
          : filteredItems.length === 2
            ? "md:grid-cols-2"
            : "md:grid-cols-3"
      }`
    : "flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory";

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
      <div className={containerClass} ref={listRef}>
        {filteredItems.map(({ label, match }, index) => (
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
              gridMode={gridJustify}
              onSelect={onSelect}
            />
          ))}
      </div>
    </div>
  );
}

function KiosqueMomentumLine({
  title,
  icon,
  matches,
  testId,
  cardTestIdPrefix,
  focusTestId,
  focusId,
  onSelect,
  tourniquet = false,
}: {
  title: string;
  icon: string;
  matches: Match[];
  testId: string;
  cardTestIdPrefix?: string;
  focusTestId?: string;
  focusId?: string | null;
  onSelect?: (id: string) => void;
  tourniquet?: boolean;
}) {
  const sorted = React.useMemo(() => [...matches].sort(byDateAsc), [matches]);
  const [focusCursor, setFocusCursor] = React.useState(() => focusIndexForTourniquet(sorted));
  const [oscillationStep, setOscillationStep] = React.useState(0);
  const [isFading, setIsFading] = React.useState(false);

  React.useEffect(() => {
    if (sorted.length === 0) {
      setFocusCursor(-1);
      return;
    }
    const byFocusId =
      focusId && sorted.findIndex((m) => m.id === focusId) >= 0
        ? sorted.findIndex((m) => m.id === focusId)
        : -1;
    setFocusCursor(byFocusId >= 0 ? byFocusId : focusIndexForTourniquet(sorted));
  }, [focusId, sorted]);

  const display = React.useMemo(
    () =>
      tourniquet
        ? kiosqueTripletWindowWithOscillation(sorted, focusCursor, oscillationStep)
        : sorted,
    [sorted, focusCursor, oscillationStep, tourniquet],
  );

  const effectiveFocusId = React.useMemo(() => {
    if (tourniquet) {
      if (focusCursor >= 0 && focusCursor < sorted.length) return sorted[focusCursor].id;
      return null;
    }
    return focusId ?? null;
  }, [focusCursor, focusId, sorted, tourniquet]);

  React.useEffect(() => {
    if (!tourniquet || sorted.length <= 1) return;
    const timer = window.setInterval(() => {
      setIsFading(true);
      window.setTimeout(() => {
        setOscillationStep((prev) => (prev + 1) % 4);
        setIsFading(false);
      }, 130);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [sorted, tourniquet]);

  const containerClass = tourniquet
    ? `grid gap-3 grid-cols-1 ${
        display.length <= 1 ? "md:grid-cols-1" : display.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
      }`
    : "flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory";

  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <img src={icon} alt={title} className="h-8 w-8 rounded-md bg-slate-800 object-cover" loading="lazy" />
          <p className="text-sm font-semibold text-slate-100">{title}</p>
        </div>
      </div>
      <div className={`${containerClass} transition-opacity duration-150 ${isFading ? "opacity-0" : "opacity-100"}`}>
        {display.map((match) => (
          <CompactMatchCard
            key={`${testId}-${match.id}`}
            match={match}
            testId={cardTestIdPrefix && match.id ? `${cardTestIdPrefix}-${match.id}` : `${testId}-${match.id}`}
            autoFocus={!!effectiveFocusId && match.id === effectiveFocusId}
            autoFocusAlign="center"
            isFocused={!!effectiveFocusId && match.id === effectiveFocusId}
            focusTestId={focusTestId}
            gridMode={tourniquet}
            fixedCenter
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
  gridMode,
  fixedCenter,
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
  gridMode?: boolean;
  fixedCenter?: boolean;
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
  const widthClass = gridMode
    ? "w-full"
    : "min-w-[220px] sm:min-w-[240px] max-w-[320px] flex-[0_0_78vw] md:flex-[0_0_280px] snap-center";
  const centerZoneClass = fixedCenter
    ? "grid grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)] items-center gap-2"
    : "flex items-center justify-between gap-2";
  return (
    <div
      className={`relative overflow-hidden rounded-lg border px-4 py-3 text-sm text-slate-100 shadow-inner ${widthClass} cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:bg-slate-900/80 hover:shadow-lg active:scale-[0.99] ${
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
      <div className={`relative ${centerZoneClass}`}>
        <div className={`flex items-center gap-2 min-w-0 ${fixedCenter ? "justify-start" : ""}`}>
          {match.teamALogo && <img src={match.teamALogo} alt={match.teamA} className="h-5 w-5 rounded-full object-cover" />}
          <span
            className={`text-[12px] font-semibold truncate ${
              hasWinner && winnerSide === "A" ? "text-emerald-300" : ""
            }`}
          >
            {match.teamA}
          </span>
        </div>
        <div className="flex w-[92px] flex-col items-center justify-center text-center">
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
    const makeSelectHandler = React.useCallback(
    (list: Match[]) => (id: string) => {
      const match = list.find((m) => m.id == id);
      if (match) {
        const isChallenge = (match.competitionType ?? "").toLowerCase() == "challenge";
        if (isChallenge) {
          navigate(`/challenge/equipe/${encodeURIComponent(match.teamA)}`);
          return;
        }
      }
      navigate(`/matches/${id}`);
    },
    [navigate],
  );

const resolveMatchRoute = React.useCallback(
    (id: string) => {
      const match = matches.find((m) => m.id === id);
      if (!match) return `/matches/${id}`;
      const isChallenge = (match.competitionType ?? "").toLowerCase() === "challenge";
      if (isChallenge) {
        return `/challenge/equipe/${encodeURIComponent(match.teamA)}`;
      }
      return `/matches/${id}`;
    },
    [matches],
  );

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

  const state = React.useMemo(() => pickStateByDate(matches), [matches]);
  const day = React.useMemo(() => dayIndex(nowMs, matches), [matches, nowMs]);
  const smallGlaceType = React.useMemo(() => smallGlaceCompetition(day), [day]);
  const smallGlaceLabel = smallGlaceType === "3v3" ? "3v3" : "Challenge";

  const triplet5v5 = React.useMemo(() => tripletForCompetition(matches, "5v5"), [matches]);
  const tripletSmallGlace = React.useMemo(
    () => tripletForCompetition(matches, smallGlaceType),
    [matches, smallGlaceType],
  );
  const orderedSmallGlace = React.useMemo(
    () => liveCenteredOrder(tripletSmallGlace, filterByCompetition(matches, smallGlaceType)),
    [tripletSmallGlace, matches, smallGlaceType],
  );
  const autoIndexSmallGlace = React.useMemo(
    () =>
      autoIndexForList(
        orderedSmallGlace,
        tripletSmallGlace.live?.id ?? tripletSmallGlace.next?.id ?? tripletSmallGlace.last?.id ?? null,
      ),
    [orderedSmallGlace, tripletSmallGlace.live, tripletSmallGlace.next, tripletSmallGlace.last],
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

  const heroTitle = React.useMemo(() => {
    if (state === "avant") return "Prêts à jouer !";
    if (state === "pendant") return "Ça joue !";
    return "Clap de fin !";
  }, [state]);
  const heroFocusLine = React.useMemo(() => {
    const sorted = [...matches].sort(byDateAsc);
    if (sorted.length === 0) return "Match non disponible";

    const first = sorted[0] ?? null;
    const last = sorted[sorted.length - 1] ?? null;
    const ongoing = sorted.filter((m) => m.status === "ongoing").pop() ?? null;
    const lastFinished = sorted.filter((m) => m.status === "finished").pop() ?? null;

    let focus: Match | null = null;
    if (state === "avant") focus = first;
    else if (state === "pendant") focus = ongoing ?? lastFinished;
    else focus = last;

    if (!focus) return "Match non disponible";
    const teamA = focus.teamA?.trim() || "Equipe A";
    const teamB = focus.teamB?.trim() || "Equipe B";
    return `${teamA} vs ${teamB}`;
  }, [matches, state]);
  const hero = React.useMemo(() => {
    return {
      title: heroTitle,
      subtitle: heroFocusLine,
    };
  }, [heroFocusLine, heroTitle]);
  const commentaryMatch = React.useMemo(() => {
    const ongoing = [...matches].filter((m) => m.status === "ongoing").sort(byDateAsc);
    if (ongoing.length > 0) return ongoing[ongoing.length - 1];
    const finished = [...matches].filter((m) => m.status === "finished").sort(byDateAsc);
    if (finished.length > 0) return finished[finished.length - 1];
    return null;
  }, [matches]);
  const heroCommentary = React.useMemo(() => getLiveCommentary(commentaryMatch), [commentaryMatch]);
  const hasLiveMatch = commentaryMatch?.status === "ongoing";
  const momentumTitle = "Focus";
  const [tickerPaused, setTickerPaused] = React.useState(false);
  const tickerItems = React.useMemo(() => {
    const matches5v5 = filterByCompetition(matches, "5v5").sort(byDateAsc);
    const focus =
      [...matches5v5].filter((m) => m.status === "ongoing").pop() ??
      [...matches5v5].filter((m) => m.status === "finished").pop() ??
      null;
    const focusText = (() => {
      if (!focus) return "Focus: Le tournoi 5v5 va commencer.";
      const a = focus.teamA?.trim() || "Equipe A";
      const b = focus.teamB?.trim() || "Equipe B";
      const commentary = getLiveCommentary(focus);
      if (focus.status === "ongoing") {
        return `Focus: ${a} vs ${b}, en cours. ${commentary}`;
      }
      if (focus.status === "finished") {
        return `Focus: ${a} vs ${b}, termine. ${commentary}`;
      }
      return `Focus: ${a} vs ${b}. ${commentary}`;
    })();

    const previousText = (() => {
      if (!focus) return "Precedent: Aucun match 5v5 termine avant focus.";
      const focusTime = new Date(focus.date).getTime();
      const previous = [...matches5v5]
        .filter((m) => m.status === "finished" && new Date(m.date).getTime() < focusTime)
        .sort(byDateAsc)
        .pop();
      if (!previous) return "Precedent: Aucun match 5v5 termine avant focus.";
      const a = previous.teamA?.trim() || "Equipe A";
      const b = previous.teamB?.trim() || "Equipe B";
      const scoreKnown = typeof previous.scoreA === "number" && typeof previous.scoreB === "number";
      if (scoreKnown) return `${a} - ${b}: ${previous.scoreA} - ${previous.scoreB}, termine.`;
      return `${a} - ${b}, termine.`;
    })();

    const nextText = (() => {
      if (!focus) return "Prochain match: Aucun prochain match 5v5.";
      const focusTime = new Date(focus.date).getTime();
      const next = [...matches5v5]
        .filter((m) => m.status === "planned" && new Date(m.date).getTime() > focusTime)
        .sort(byDateAsc)[0];
      if (!next) return "Prochain match: Aucun prochain match 5v5.";
      const a = next.teamA?.trim() || "Equipe A";
      const b = next.teamB?.trim() || "Equipe B";
      return `Prochain match: ${a} - ${b}.`;
    })();

    return [focusText, previousText, nextText];
  }, [matches]);

  const beforeUpcoming5v5 = React.useMemo(() => upcomingMatches(matches, "5v5").slice(0, 3), [matches]);
  const beforeUpcomingChallenge = React.useMemo(
    () => upcomingMatches(matches, "challenge").slice(0, 3),
    [matches],
  );
  const beforeFocus5v5 = React.useMemo(() => beforeUpcoming5v5[0]?.id ?? null, [beforeUpcoming5v5]);
  const beforeFocusChallenge = React.useMemo(
    () => beforeUpcomingChallenge[0]?.id ?? null,
    [beforeUpcomingChallenge],
  );
  const afterChallengeWinners = React.useMemo(
    () => recentMatches(matches, "challenge").slice(-3).reverse(),
    [matches],
  );
  const afterFocusChallenge = React.useMemo(
    () => (afterChallengeWinners[0]?.id ? afterChallengeWinners[0].id : null),
    [afterChallengeWinners],
  );
  const kiosque5v5Matches = React.useMemo(() => {
    if (state === "avant") return beforeUpcoming5v5;
    return filterByCompetition(matches, "5v5").sort(byDateAsc);
  }, [beforeUpcoming5v5, matches, state]);
  const kiosque5v5FocusId = React.useMemo(() => {
    if (state === "avant") return beforeFocus5v5;
    return triplet5v5.live?.id ?? triplet5v5.last?.id ?? null;
  }, [beforeFocus5v5, state, triplet5v5.last?.id, triplet5v5.live?.id]);

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
          <section className="rounded-xl border border-cyan-400/35 bg-[linear-gradient(125deg,rgba(8,20,44,0.95),rgba(7,18,38,0.9),rgba(12,30,52,0.92))] backdrop-blur px-4 py-3 shadow-[0_20px_48px_-28px_rgba(34,211,238,0.5)]">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-800/80 flex-shrink-0 border border-cyan-300/30">
              <img src={homeIcon} alt="Accueil 2" className="h-full w-full object-cover scale-150" loading="lazy" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold text-white" data-testid="home-hero-title">
                {hero.title}
              </h1>
              <p className="text-sm text-slate-200">{hero.subtitle}</p>
            </div>
          </div>
          {hasLiveMatch ? (
            <span className="inline-flex rounded-md border border-amber-300/80 bg-amber-500/20 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-100">
              live
            </span>
          ) : null}
        </div>
        <p className="rounded-md border border-slate-700/80 bg-slate-900/55 px-3 py-2 text-sm text-cyan-100" data-testid="home-hero-commentary">
          {heroCommentary}
        </p>
        {selectedTeam && (
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-200 pr-1">
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
        {isDegraded && (
          <div
            className="mt-2 rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
            data-testid="home-degraded-banner"
          >
            Mode degrade (reconnexion en cours) - actualisation toutes les 30s.
          </div>
        )}
          </section>
          <section
            className="mt-2 overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950/75 px-3 py-2"
            data-testid="home-focus-ticker"
            onMouseEnter={() => setTickerPaused(true)}
            onMouseLeave={() => setTickerPaused(false)}
            onTouchStart={() => setTickerPaused(true)}
            onTouchEnd={() => setTickerPaused(false)}
          >
            <style>{`
              .home2-ticker-track {
                display: flex;
                width: max-content;
                gap: 1.25rem;
                animation: home2TickerMove 24s linear infinite;
              }
              .home2-ticker-track.pause {
                animation-play-state: paused;
              }
              @keyframes home2TickerMove {
                from { transform: translateX(0); }
                to { transform: translateX(-50%); }
              }
            `}</style>
            <div className={`home2-ticker-track ${tickerPaused ? "pause" : ""}`}>
              {[...tickerItems, ...tickerItems].map((item, idx) => (
                <span key={`${item}-${idx}`} className="whitespace-nowrap text-xs text-cyan-100">
                  {item}
                </span>
              ))}
            </div>
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
                  <KiosqueMomentumLine
                    title="5v5"
                    icon={icon5v5}
                    matches={kiosque5v5Matches}
                    testId="home-now-5v5"
                    cardTestIdPrefix="home-momentum-card"
                    focusId={kiosque5v5FocusId}
                    focusTestId="home-momentum-focus"
                    tourniquet
                    onSelect={makeSelectHandler(kiosque5v5Matches)}
                  />
                  <CompactLine
                    title="Challenge"
                    icon={iconChallenge}
                    items={beforeUpcomingChallenge.map((m) => ({ match: m }))}
                    testId="home-challenge-compact"
                    cardTestIdPrefix="home-momentum-card"
                    focusId={beforeFocusChallenge}
                    focusTestId="home-momentum-focus"
                    gridJustify
                    onSelect={makeSelectHandler(beforeUpcomingChallenge)}
                  />
                </>
              )}
              {state === "pendant" && (
                <>
                  <KiosqueMomentumLine
                    title="5v5"
                    icon={icon5v5}
                    matches={kiosque5v5Matches}
                    testId="home-now-5v5"
                    cardTestIdPrefix="home-momentum-card"
                    focusId={kiosque5v5FocusId}
                    focusTestId="home-momentum-focus"
                    tourniquet
                    onSelect={makeSelectHandler(kiosque5v5Matches)}
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
                    gridJustify
                    onSelect={makeSelectHandler(orderedSmallGlace)}
                  />
                </>
              )}
              {state === "apres" && (
                <>
                  <KiosqueMomentumLine
                    title="5v5"
                    icon={icon5v5}
                    matches={kiosque5v5Matches}
                    testId="home-now-5v5"
                    cardTestIdPrefix="home-momentum-card"
                    focusId={kiosque5v5FocusId}
                    focusTestId="home-momentum-focus"
                    tourniquet
                    onSelect={makeSelectHandler(kiosque5v5Matches)}
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
                    gridJustify
                    onSelect={makeSelectHandler(afterChallengeWinners)}
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
            onSelect={(id) => navigate(resolveMatchRoute(id))}
            smallGlaceLabel={smallGlaceLabel}
            smallGlaceType={smallGlaceType}
            mealOfDay={meals?.mealOfDay ?? null}
          />
        </section>
      )}

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3" data-testid="home-teams-grid">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Le Plateau des Équipes</h2>
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



