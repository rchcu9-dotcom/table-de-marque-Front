import React from "react";
import List, { type Field, type SortConfig } from "../components/collections/List";
import Badge from "../components/ds/Badge";
import Spinner from "../components/ds/Spinner";
import HexBadge from "../components/ds/HexBadge";
import type { Match } from "../api/match";
import { useMatches } from "../hooks/useMatches";
import { useNavigate } from "react-router-dom";
import HorizontalMatchSlider from "../components/collections/HorizontalMatchSlider";

type Props = {
  searchQuery?: string;
  sort?: SortConfig<Match>;
  onSortChange?: (sort: SortConfig<Match>) => void;
};

function computeMomentum(source: Match[]): Match[] {
  if (!source || source.length === 0) return [];

  const sortByDateAsc = [...source].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const ongoingIndex = sortByDateAsc.findIndex((m) => m.status === "ongoing");
  const allFinished = sortByDateAsc.every(
    (m) => m.status === "finished" || m.status === "deleted",
  );
  const hasFinished = sortByDateAsc.some((m) => m.status === "finished");
  const hasPlanned = sortByDateAsc.some((m) => m.status === "planned");

  const selectAndSortDesc = (arr: Match[]) =>
    [...arr]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

  // Aucun match en cours
  if (ongoingIndex === -1) {
    if (allFinished) {
      // tous joués -> 3 derniers, du plus récent au plus ancien
      return selectAndSortDesc(sortByDateAsc.slice(-3));
    }
    // tournoi démarré (au moins un joué et un à jouer) -> centrer sur le prochain match à jouer
    if (hasFinished && hasPlanned) {
      const nextPlannedIndex = sortByDateAsc.findIndex((m) => m.status === "planned");
      const start = Math.max(nextPlannedIndex - 1, 0);
      const end = Math.min(nextPlannedIndex + 2, sortByDateAsc.length);
      return selectAndSortDesc(sortByDateAsc.slice(start, end));
    }
    // tournoi pas commencé (tous planifiés) -> 3 premiers, ordonnés du plus récent au plus ancien
    return selectAndSortDesc(sortByDateAsc.slice(0, 3));
  }

  const lastIndex = sortByDateAsc.length - 1;

  // match en cours est le premier -> lui + 2 suivants
  if (ongoingIndex === 0) {
    return selectAndSortDesc(sortByDateAsc.slice(0, 3));
  }

  // match en cours est le dernier -> lui + 2 précédents les plus récents
  if (ongoingIndex === lastIndex) {
    return selectAndSortDesc(sortByDateAsc.slice(Math.max(lastIndex - 2, 0), lastIndex + 1));
  }

  // match en cours au milieu -> un avant et un après
  return selectAndSortDesc(sortByDateAsc.slice(ongoingIndex - 1, ongoingIndex + 2));
}

export default function MatchListPage({
  searchQuery = "",
  sort,
  onSortChange: _onSortChange,
}: Props) {
  const formatCountdown = React.useCallback((target: Date | null) => {
    if (!target) return "";
    const diffMs = target.getTime() - Date.now();
    if (diffMs <= 0) return "quelques instants";
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${Math.max(minutes, 1)}min`;
  }, []);

  const {
    data: planningData,
    isLoading: isPlanningLoading,
    isError: isPlanningError,
  } = useMatches();
  const navigate = useNavigate();
  const [allMatches, setAllMatches] = React.useState<Match[]>([]);
  const [teamFilter, setTeamFilter] = React.useState<string>("all");
  const [pouleFilter, setPouleFilter] = React.useState<string>("all");

  React.useEffect(() => {
    if (planningData) {
      setAllMatches(planningData);
    }
  }, [planningData]);

  const effectiveSort = sort ?? { key: "date", direction: "asc" as const };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredMatches = React.useMemo<Match[]>(() => {
    if (!allMatches) return [];
    let base = allMatches;

    if (teamFilter !== "all") {
      const needle = teamFilter.toLowerCase();
      base = base.filter(
        (item) =>
          item.teamA.toLowerCase() === needle || item.teamB.toLowerCase() === needle,
      );
    }

    if (pouleFilter !== "all") {
      base = base.filter((item) => {
        const poule = (item.pouleName || item.pouleCode || "").toLowerCase();
        return poule === pouleFilter;
      });
    }

    if (!normalizedQuery) return base;
    return base.filter((item) => {
      const haystack = [
        item.teamA,
        item.teamB,
        `${item.teamA} ${item.teamB}`,
        item.id,
        item.status,
        new Date(item.date).toLocaleString(),
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return haystack.some((value) => value.includes(normalizedQuery));
    });
  }, [allMatches, normalizedQuery, teamFilter, pouleFilter]);

  const teamOptions = React.useMemo(() => {
    const set = new Set<string>();
    allMatches?.forEach((m) => {
      if (m.teamA) set.add(m.teamA);
      if (m.teamB) set.add(m.teamB);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allMatches]);

  const pouleOptions = React.useMemo(() => {
    const set = new Set<string>();
    allMatches?.forEach((m) => {
      const label = (m.pouleName || m.pouleCode || "").trim();
      if (label) set.add(label);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allMatches]);

  const momentumMatchesSource = computeMomentum(allMatches);
  const momentumMatches = React.useMemo(
    () =>
      [...(momentumMatchesSource ?? [])].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [momentumMatchesSource],
  );
  const currentMomentumId =
    momentumMatches[Math.floor(momentumMatches.length / 2)]?.id;
  const momentumTitle = React.useMemo(() => {
    if (!allMatches || allMatches.length === 0) return "Momentum";
    const anyOngoing = allMatches.some((m) => m.status === "ongoing");
    const allFinished = allMatches.every(
      (m) => m.status === "finished" || m.status === "deleted",
    );
    const nextPlannedDate =
      allMatches
        .filter((m) => m.status === "planned")
        .map((m) => new Date(m.date))
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

    if (anyOngoing) return "En ce moment";
    if (allFinished) return "Live terminé";
    if (nextPlannedDate) return `Live dans ${formatCountdown(nextPlannedDate)}`;
    return "Momentum";
  }, [allMatches, formatCountdown]);
  const momentumBorderForStatus = (m: Match) => {
    if (m.status === "ongoing") return "!border-amber-300/70";
    if (m.status === "finished") return "!border-sky-400/70";
    return "!border-slate-600/70";
  };

  const renderFields = (isMomentum = false): Field<Match>[] => [
    {
      key: "teamA",
      label: "Match",
      render: (_value, item) => {
        const hasScore =
          (item.status === "ongoing" || item.status === "finished") &&
          item.scoreA !== null &&
          item.scoreB !== null;
        const winner =
          hasScore && item.scoreA !== null && item.scoreB !== null && item.scoreA !== item.scoreB
            ? item.scoreA > item.scoreB
              ? "A"
              : "B"
            : null;

        const logoSize = isMomentum ? 40 : 34;

        const pouleLabel = item.pouleName || item.pouleCode;

        return (
          <div
            data-testid={isMomentum ? `momentum-match-${item.id}` : `match-line-${item.id}`}
            className={`flex w-full items-center justify-between gap-2 ${isMomentum ? "text-slate-100" : ""}`}
          >
            <HexBadge name={item.teamA} imageUrl={item.teamALogo ?? undefined} size={logoSize} />
            <div className="flex-1 leading-tight space-y-1">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-200">
                  {pouleLabel ? `Poule ${pouleLabel}` : "Poule ?"}
                </span>
              </div>
              <div className="text-sm font-semibold text-center">
                <span className={winner === "A" ? "text-emerald-300 font-semibold" : "text-slate-100"}>
                  {item.teamA}
                </span>{" "}
                {hasScore ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-100 mx-2">
                    <span>{item.scoreA}</span>
                    <span className="text-slate-500">-</span>
                    <span>{item.scoreB}</span>
                  </span>
                ) : (
                  <span className="text-slate-500 mx-2">vs</span>
                )}
                <span className={winner === "B" ? "text-emerald-300 font-semibold" : "text-slate-100"}>
                  {item.teamB}
                </span>
              </div>
            </div>
            <HexBadge name={item.teamB} imageUrl={item.teamBLogo ?? undefined} size={logoSize} />
          </div>
        );
      },
    },
    {
      key: "date",
      label: "Date",
      secondary: true,
      hideLabel: true,
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: "status",
      label: "Statut",
      secondary: true,
      hideLabel: true,
      render: (value: Match["status"]) => {
        const map: Record<
          Match["status"],
          { label: string; color: "success" | "muted" | "warning" | "default" | "info" }
        > = {
          planned: { label: "Planifie", color: "muted" },
          ongoing: { label: "En cours", color: "warning" },
          finished: { label: "Termine", color: "info" },
          deleted: { label: "Supprime", color: "muted" },
        };
        const meta = map[value];
        return <Badge color={meta.color}>{meta.label}</Badge>;
      },
    },
  ];

  const fields = renderFields(false);
  const renderLeading = (_item: Match) => (
    <div className="flex w-full items-center justify-center gap-3" />
  );

  return (
    <div className="space-y-4">
      {isPlanningLoading && (
        <div className="flex items-center gap-2 text-slate-300 text-sm">
          <Spinner />
          <span>Chargement...</span>
        </div>
      )}

      {isPlanningError && (
        <div className="text-red-400 text-sm">Erreur de chargement.</div>
      )}

      {momentumMatches && momentumMatches.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-base font-semibold text-slate-100">
              {momentumTitle}
            </span>
          </div>
          <div data-testid="momentum-list" className="pb-1">
            <HorizontalMatchSlider
              matches={momentumMatches}
              currentMatchId={currentMomentumId}
              testIdPrefix="momentum-match"
              onSelect={(id) => navigate(`/matches/${id}`)}
              getCardClassName={(item) =>
                `${momentumBorderForStatus(item)} ${
                  item.status === "ongoing" ? "live-pulse-card" : ""
                } !bg-slate-900/70 shadow-none`
              }
            />
          </div>
        </div>
      )}

      {filteredMatches && filteredMatches.length === 0 && !isPlanningLoading && (
        <div className="text-slate-400 text-sm">Aucun match.</div>
      )}

      {filteredMatches && filteredMatches.length > 0 && !isPlanningLoading && (
        <div className="space-y-2">
          <div className="text-base font-semibold text-slate-100">Planning</div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-400">
              {filteredMatches.length} match{filteredMatches.length > 1 ? "s" : ""}
            </div>

            <div className="flex items-center gap-3 text-sm flex-wrap">
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-2 py-1 text-slate-100"
              >
                <option value="all">Les equipes</option>
                {teamOptions.map((team) => (
                  <option key={team} value={team.toLowerCase()}>
                    {team}
                  </option>
                ))}
              </select>
              <select
                value={pouleFilter}
                onChange={(e) => setPouleFilter(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-2 py-1 text-slate-100"
              >
                <option value="all">Les poules</option>
                {pouleOptions.map((poule) => (
                  <option key={poule} value={poule.toLowerCase()}>
                    {poule}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div data-testid="planning-list">
            <List
              items={filteredMatches}
              fields={fields}
              sort={effectiveSort}
              alignCenter
              renderLeading={renderLeading}
              cardClassName={(item) =>
                `${item.status === "ongoing" ? "live-pulse-card !border-amber-300/60" : ""}`
              }
              onItemClick={(m) => navigate(`/matches/${m.id}`)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
