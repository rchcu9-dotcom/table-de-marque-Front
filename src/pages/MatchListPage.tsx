import React from "react";
import List, { type Field, type SortConfig } from "../components/collections/List";
import Badge from "../components/ds/Badge";
import Spinner from "../components/ds/Spinner";

import type { Match } from "../api/match";
import { useMatches } from "../hooks/useMatches";
import { useNavigate } from "react-router-dom";

type Props = {
  searchQuery?: string;
  sort?: SortConfig<Match>;
  onSortChange?: (sort: SortConfig<Match>) => void;
};

export default function MatchListPage({
  searchQuery = "",
  sort,
  onSortChange,
}: Props) {
  const { data, isLoading, isError } = useMatches();
  const navigate = useNavigate();
  const [localSort, setLocalSort] = React.useState<SortConfig<Match>>({
    key: "date",
    direction: "asc",
  });

  const effectiveSort = sort ?? localSort;
  const updateSort = onSortChange ?? setLocalSort;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredMatches = React.useMemo(() => {
    if (!data) return [];
    if (!normalizedQuery) return data;
    return data.filter((item) => {
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
  }, [data, normalizedQuery]);

  const fields: Field<Match>[] = [
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

        if (!hasScore) {
          return `${item.teamA} vs ${item.teamB}`;
        }

        return (
          <span
            data-testid={`match-line-${item.id}`}
            className="flex items-center gap-2"
          >
            <span
              className={
                winner === "A"
                  ? "text-emerald-300 font-semibold"
                  : "text-slate-100"
              }
            >
              {item.teamA}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-100">
              <span>{item.scoreA}</span>
              <span className="text-slate-500">-</span>
              <span>{item.scoreB}</span>
            </span>
            <span
              className={
                winner === "B"
                  ? "text-emerald-300 font-semibold"
                  : "text-slate-100"
              }
            >
              {item.teamB}
            </span>
          </span>
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
        const map: Record<Match["status"], string> = {
          planned: "Planifie",
          ongoing: "En cours",
          finished: "Termine",
          deleted: "Supprime",
        };
        return <Badge color="accent">{map[value]}</Badge>;
      },
    },
  ];

  const sortOptions: Array<{ label: string; key: SortConfig<Match>["key"] }> = [
    { label: "Date", key: "date" },
    { label: "Equipe A", key: "teamA" },
    { label: "Equipe B", key: "teamB" },
    { label: "Statut", key: "status" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-400">
          {filteredMatches.length} match{filteredMatches.length > 1 ? "s" : ""}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Trier</span>
          <select
            value={String(effectiveSort.key)}
            onChange={(e) =>
              updateSort({ ...effectiveSort, key: e.target.value as keyof Match })
            }
            className="rounded-xl border border-slate-800 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {sortOptions.map((option) => (
              <option key={option.key as string} value={option.key as string}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={effectiveSort.direction}
            onChange={(e) =>
              updateSort({
                ...effectiveSort,
                direction: e.target.value as SortConfig<Match>["direction"],
              })
            }
            className="rounded-xl border border-slate-800 bg-slate-900 px-2 py-1 text-slate-100"
          >
            <option value="asc">Croissant</option>
            <option value="desc">Decroissant</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-300 text-sm">
          <Spinner />
          <span>Chargement...</span>
        </div>
      )}

      {isError && (
        <div className="text-red-400 text-sm">Erreur de chargement.</div>
      )}

      {filteredMatches && filteredMatches.length === 0 && !isLoading && (
        <div className="text-slate-400 text-sm">Aucun match.</div>
      )}

      {filteredMatches && filteredMatches.length > 0 && (
        <List
          items={filteredMatches}
          fields={fields}
          sort={effectiveSort}
          onItemClick={(m) => navigate(`/matches/${m.id}`)}
        />
      )}
    </div>
  );
}
