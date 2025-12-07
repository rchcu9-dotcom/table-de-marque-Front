import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import List from "../components/collections/List";
import Badge from "../components/ds/Badge";
import Spinner from "../components/ds/Spinner";
import HexBadge from "../components/ds/HexBadge";
import { useMatches } from "../hooks/useMatches";
import { useNavigate } from "react-router-dom";
function computeMomentum(source) {
    if (!source || source.length === 0)
        return [];
    const sortByDateAsc = [...source].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const ongoingIndex = sortByDateAsc.findIndex((m) => m.status === "ongoing");
    const allFinished = sortByDateAsc.every((m) => m.status === "finished" || m.status === "deleted");
    const hasFinished = sortByDateAsc.some((m) => m.status === "finished");
    const hasPlanned = sortByDateAsc.some((m) => m.status === "planned");
    const selectAndSortDesc = (arr) => [...arr]
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
export default function MatchListPage({ searchQuery = "", sort, onSortChange: _onSortChange, }) {
    const { data: planningData, isLoading: isPlanningLoading, isError: isPlanningError, } = useMatches();
    const navigate = useNavigate();
    const [allMatches, setAllMatches] = React.useState([]);
    const [teamFilter, setTeamFilter] = React.useState("all");
    const [pouleFilter, setPouleFilter] = React.useState("all");
    React.useEffect(() => {
        if (planningData) {
            setAllMatches(planningData);
        }
    }, [planningData]);
    const effectiveSort = sort ?? { key: "date", direction: "asc" };
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredMatches = React.useMemo(() => {
        if (!allMatches)
            return [];
        let base = allMatches;
        if (teamFilter !== "all") {
            const needle = teamFilter.toLowerCase();
            base = base.filter((item) => item.teamA.toLowerCase() === needle || item.teamB.toLowerCase() === needle);
        }
        if (pouleFilter !== "all") {
            base = base.filter((item) => {
                const poule = (item.pouleName || item.pouleCode || "").toLowerCase();
                return poule === pouleFilter;
            });
        }
        if (!normalizedQuery)
            return base;
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
        const set = new Set();
        allMatches?.forEach((m) => {
            if (m.teamA)
                set.add(m.teamA);
            if (m.teamB)
                set.add(m.teamB);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [allMatches]);
    const pouleOptions = React.useMemo(() => {
        const set = new Set();
        allMatches?.forEach((m) => {
            const label = (m.pouleName || m.pouleCode || "").trim();
            if (label)
                set.add(label);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [allMatches]);
    const momentumMatchesSource = computeMomentum(allMatches);
    const momentumMatches = React.useMemo(() => [...(momentumMatchesSource ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [momentumMatchesSource]);
    const momentumBorderForStatus = (m) => {
        if (m.status === "ongoing")
            return "!border-amber-300/70";
        if (m.status === "finished")
            return "!border-sky-400/70";
        return "!border-slate-600/70";
    };
    const renderFields = (isMomentum = false) => [
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
                const logoSize = isMomentum ? 40 : 34;
                const pouleLabel = item.pouleName || item.pouleCode;
                return (_jsxs("div", { "data-testid": isMomentum ? `momentum-match-${item.id}` : `match-line-${item.id}`, className: `flex w-full items-center justify-between gap-2 ${isMomentum ? "text-slate-100" : ""}`, children: [_jsx(HexBadge, { name: item.teamA, imageUrl: item.teamALogo ?? undefined, size: logoSize }), _jsxs("div", { className: "flex-1 leading-tight space-y-1", children: [_jsx("div", { className: "flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400", children: _jsx("span", { className: "rounded-full bg-slate-800 px-2 py-0.5 text-slate-200", children: pouleLabel ? `Poule ${pouleLabel}` : "Poule ?" }) }), _jsxs("div", { className: "text-sm font-semibold text-center", children: [_jsx("span", { className: winner === "A" ? "text-emerald-300 font-semibold" : "text-slate-100", children: item.teamA }), " ", hasScore ? (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-100 mx-2", children: [_jsx("span", { children: item.scoreA }), _jsx("span", { className: "text-slate-500", children: "-" }), _jsx("span", { children: item.scoreB })] })) : (_jsx("span", { className: "text-slate-500 mx-2", children: "vs" })), _jsx("span", { className: winner === "B" ? "text-emerald-300 font-semibold" : "text-slate-100", children: item.teamB })] })] }), _jsx(HexBadge, { name: item.teamB, imageUrl: item.teamBLogo ?? undefined, size: logoSize })] }));
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
                    planned: { label: "Planifie", color: "muted" },
                    ongoing: { label: "En cours", color: "warning" },
                    finished: { label: "Termine", color: "info" },
                    deleted: { label: "Supprime", color: "muted" },
                };
                const meta = map[value];
                return _jsx(Badge, { color: meta.color, children: meta.label });
            },
        },
    ];
    const fields = renderFields(false);
    const momentumFields = renderFields(true);
    const renderLeading = (_item) => (_jsx("div", { className: "flex w-full items-center justify-center gap-3" }));
    return (_jsxs("div", { className: "space-y-4", children: [isPlanningLoading && (_jsxs("div", { className: "flex items-center gap-2 text-slate-300 text-sm", children: [_jsx(Spinner, {}), _jsx("span", { children: "Chargement..." })] })), isPlanningError && (_jsx("div", { className: "text-red-400 text-sm", children: "Erreur de chargement." })), momentumMatches && momentumMatches.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "flex items-center gap-2 text-sm text-slate-400", children: _jsx("span", { className: "text-base font-semibold text-slate-100", children: "Momentum" }) }), _jsx("div", { "data-testid": "momentum-list", children: _jsx(List, { items: momentumMatches, fields: momentumFields, alignCenter: true, renderLeading: renderLeading, cardClassName: (item) => `${momentumBorderForStatus(item)} ${item.status === "ongoing" ? "live-pulse-card" : ""} !bg-slate-900/70 shadow-none`, onItemClick: (m) => navigate(`/matches/${m.id}`) }) })] })), filteredMatches && filteredMatches.length === 0 && !isPlanningLoading && (_jsx("div", { className: "text-slate-400 text-sm", children: "Aucun match." })), filteredMatches && filteredMatches.length > 0 && !isPlanningLoading && (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-base font-semibold text-slate-100", children: "Planning" }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "text-sm text-slate-400", children: [filteredMatches.length, " match", filteredMatches.length > 1 ? "s" : ""] }), _jsxs("div", { className: "flex items-center gap-3 text-sm flex-wrap", children: [_jsxs("select", { value: teamFilter, onChange: (e) => setTeamFilter(e.target.value), className: "rounded-xl border border-slate-800 bg-slate-900 px-2 py-1 text-slate-100", children: [_jsx("option", { value: "all", children: "Les equipes" }), teamOptions.map((team) => (_jsx("option", { value: team.toLowerCase(), children: team }, team)))] }), _jsxs("select", { value: pouleFilter, onChange: (e) => setPouleFilter(e.target.value), className: "rounded-xl border border-slate-800 bg-slate-900 px-2 py-1 text-slate-100", children: [_jsx("option", { value: "all", children: "Les poules" }), pouleOptions.map((poule) => (_jsx("option", { value: poule.toLowerCase(), children: poule }, poule)))] })] })] }), _jsx("div", { "data-testid": "planning-list", children: _jsx(List, { items: filteredMatches, fields: fields, sort: effectiveSort, alignCenter: true, renderLeading: renderLeading, cardClassName: (item) => `${item.status === "ongoing" ? "live-pulse-card !border-amber-300/60" : ""}`, onItemClick: (m) => navigate(`/matches/${m.id}`) }) })] }))] }));
}
