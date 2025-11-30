import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import List from "../components/collections/List";
import Badge from "../components/ds/Badge";
import Spinner from "../components/ds/Spinner";
import { useMatches } from "../hooks/useMatches";
import { useNavigate } from "react-router-dom";
export default function MatchListPage({ searchQuery = "", sort, onSortChange, }) {
    const { data, isLoading, isError } = useMatches();
    const navigate = useNavigate();
    const [localSort, setLocalSort] = React.useState({
        key: "date",
        direction: "asc",
    });
    const effectiveSort = sort ?? localSort;
    const updateSort = onSortChange ?? setLocalSort;
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredMatches = React.useMemo(() => {
        if (!data)
            return [];
        if (!normalizedQuery)
            return data;
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
    const momentumMatches = React.useMemo(() => {
        if (!data || data.length === 0)
            return [];
        const sortByDateAsc = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const ongoingIndex = sortByDateAsc.findIndex((m) => m.status === "ongoing");
        const allFinished = sortByDateAsc.every((m) => m.status === "finished" || m.status === "deleted");
        // 1) Aucun match démarré => 3 premiers par date croissante
        if (ongoingIndex === -1) {
            if (allFinished) {
                // 3) Tous joués => 3 derniers par date décroissante
                const desc = [...sortByDateAsc].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                return desc.slice(0, 3);
            }
            return sortByDateAsc.slice(0, 3);
        }
        // 2) Il y a un match en cours
        const lastIndex = sortByDateAsc.length - 1;
        if (ongoingIndex === 0) {
            // 2-1) premier match par date croissante
            return sortByDateAsc.slice(0, 3);
        }
        if (ongoingIndex === lastIndex) {
            // 2-3) match en cours est le dernier
            return sortByDateAsc.slice(Math.max(lastIndex - 2, 0), lastIndex + 1);
        }
        // 2-2) match en cours au milieu
        return sortByDateAsc.slice(ongoingIndex - 1, ongoingIndex + 2);
    }, [data]);
    const fields = [
        {
            key: "teamA",
            label: "Match",
            render: (_value, item) => {
                const hasScore = (item.status === "ongoing" || item.status === "finished") &&
                    item.scoreA !== null &&
                    item.scoreB !== null;
                const winner = hasScore && item.scoreA !== null && item.scoreB !== null && item.scoreA !== item.scoreB
                    ? item.scoreA > item.scoreB
                        ? "A"
                        : "B"
                    : null;
                if (!hasScore) {
                    return `${item.teamA} vs ${item.teamB}`;
                }
                return (_jsxs("span", { "data-testid": `match-line-${item.id}`, className: "flex items-center gap-2", children: [_jsx("span", { className: winner === "A"
                                ? "text-emerald-300 font-semibold"
                                : "text-slate-100", children: item.teamA }), _jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-100", children: [_jsx("span", { children: item.scoreA }), _jsx("span", { className: "text-slate-500", children: "-" }), _jsx("span", { children: item.scoreB })] }), _jsx("span", { className: winner === "B"
                                ? "text-emerald-300 font-semibold"
                                : "text-slate-100", children: item.teamB })] }));
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
            render: (value) => {
                const map = {
                    planned: "Planifie",
                    ongoing: "En cours",
                    finished: "Termine",
                    deleted: "Supprime",
                };
                return _jsx(Badge, { color: "accent", children: map[value] });
            },
        },
    ];
    const sortOptions = [
        { label: "Date", key: "date" },
        { label: "Equipe A", key: "teamA" },
        { label: "Equipe B", key: "teamB" },
        { label: "Statut", key: "status" },
    ];
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "text-sm text-slate-400", children: [filteredMatches.length, " match", filteredMatches.length > 1 ? "s" : ""] }), _jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("span", { className: "text-slate-500", children: "Trier" }), _jsx("select", { value: String(effectiveSort.key), onChange: (e) => updateSort({ ...effectiveSort, key: e.target.value }), className: "rounded-xl border border-slate-800 bg-slate-900 px-2 py-1 text-slate-100", children: sortOptions.map((option) => (_jsx("option", { value: option.key, children: option.label }, option.key))) }), _jsxs("select", { value: effectiveSort.direction, onChange: (e) => updateSort({
                                    ...effectiveSort,
                                    direction: e.target.value,
                                }), className: "rounded-xl border border-slate-800 bg-slate-900 px-2 py-1 text-slate-100", children: [_jsx("option", { value: "asc", children: "Croissant" }), _jsx("option", { value: "desc", children: "Decroissant" })] })] })] }), isLoading && (_jsxs("div", { className: "flex items-center gap-2 text-slate-300 text-sm", children: [_jsx(Spinner, {}), _jsx("span", { children: "Chargement..." })] })), isError && (_jsx("div", { className: "text-red-400 text-sm", children: "Erreur de chargement." })), data && data.length > 0 && !isLoading && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm text-slate-400", children: [_jsx("span", { className: "text-base font-semibold text-slate-100", children: "Momentum" }), _jsx("span", { className: "rounded-full bg-slate-800 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300", children: "Focus live" })] }), momentumMatches.length > 0 ? (_jsx("div", { "data-testid": "momentum-list", children: _jsx(List, { items: momentumMatches, fields: fields, onItemClick: (m) => navigate(`/matches/${m.id}`) }) })) : (_jsx("div", { className: "text-slate-500 text-sm", children: "Aucun match \u00E0 afficher pour le momentum." }))] })), filteredMatches && filteredMatches.length === 0 && !isLoading && (_jsx("div", { className: "text-slate-400 text-sm", children: "Aucun match." })), filteredMatches && filteredMatches.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-base font-semibold text-slate-100", children: "Planning" }), _jsx(List, { items: filteredMatches, fields: fields, sort: effectiveSort, onItemClick: (m) => navigate(`/matches/${m.id}`) })] }))] }));
}
