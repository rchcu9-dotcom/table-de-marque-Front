import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import List from "../components/collections/List";
import Badge from "../components/ds/Badge";
import Spinner from "../components/ds/Spinner";
import HexBadge from "../components/ds/HexBadge";
import { useMatches, useMomentumMatches } from "../hooks/useMatches";
import { useNavigate } from "react-router-dom";
function computeMomentum(source) {
    if (!source || source.length === 0)
        return [];
    const sortByDateAsc = [...source].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
}
export default function MatchListPage({ searchQuery = "", sort, onSortChange: _onSortChange, }) {
    const { data: momentumData, isLoading: isMomentumLoading, isError: isMomentumError, } = useMomentumMatches();
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
    const momentumMatches = momentumData ?? computeMomentum(allMatches);
    const hasOngoingMomentum = momentumMatches.some((m) => m.status === "ongoing");
    const hasFinishedMomentum = momentumMatches.some((m) => m.status === "finished");
    const momentumBorderClass = hasOngoingMomentum
        ? "!border-amber-300/70"
        : hasFinishedMomentum
            ? "!border-emerald-400/70"
            : "!border-slate-500/60";
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
                    finished: { label: "Termine", color: "success" },
                    deleted: { label: "Supprime", color: "muted" },
                };
                const meta = map[value];
                return _jsx(Badge, { color: meta.color, children: meta.label });
            },
        },
    ];
    const fields = renderFields(false);
    const momentumFields = renderFields(true);
    const renderLeading = (item) => (_jsx("div", { className: "flex w-full items-center justify-center gap-3" }));
    return (_jsxs("div", { className: "space-y-4", children: [isPlanningLoading && (_jsxs("div", { className: "flex items-center gap-2 text-slate-300 text-sm", children: [_jsx(Spinner, {}), _jsx("span", { children: "Chargement..." })] })), isPlanningError && (_jsx("div", { className: "text-red-400 text-sm", children: "Erreur de chargement." })), momentumMatches && momentumMatches.length > 0 && !isMomentumLoading && (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "flex items-center gap-2 text-sm text-slate-400", children: _jsx("span", { className: "text-base font-semibold text-slate-100", children: "Momentum" }) }), _jsx("div", { "data-testid": "momentum-list", children: _jsx(List, { items: momentumMatches, fields: momentumFields, alignCenter: true, renderLeading: renderLeading, cardClassName: (item) => `${momentumBorderClass} ${item.status === "ongoing" ? "live-pulse-card" : ""} !bg-slate-900/70 shadow-none`, onItemClick: (m) => navigate(`/matches/${m.id}`) }) })] })), isMomentumLoading && (_jsxs("div", { className: "flex items-center gap-2 text-slate-300 text-sm", children: [_jsx(Spinner, {}), _jsx("span", { children: "Chargement du momentum..." })] })), isMomentumError && (_jsx("div", { className: "text-red-400 text-sm", children: "Erreur de chargement du momentum." })), filteredMatches && filteredMatches.length === 0 && !isPlanningLoading && (_jsx("div", { className: "text-slate-400 text-sm", children: "Aucun match." })), filteredMatches && filteredMatches.length > 0 && !isPlanningLoading && (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-base font-semibold text-slate-100", children: "Planning" }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "text-sm text-slate-400", children: [filteredMatches.length, " match", filteredMatches.length > 1 ? "s" : ""] }), _jsxs("div", { className: "flex items-center gap-3 text-sm flex-wrap", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-slate-500", children: "Equipes" }), _jsxs("select", { value: teamFilter, onChange: (e) => setTeamFilter(e.target.value), className: "rounded-xl border border-slate-800 bg-slate-900 px-2 py-1 text-slate-100", children: [_jsx("option", { value: "all", children: "Toutes" }), teamOptions.map((team) => (_jsx("option", { value: team.toLowerCase(), children: team }, team)))] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-slate-500", children: "Poule" }), _jsxs("select", { value: pouleFilter, onChange: (e) => setPouleFilter(e.target.value), className: "rounded-xl border border-slate-800 bg-slate-900 px-2 py-1 text-slate-100", children: [_jsx("option", { value: "all", children: "Toutes" }), pouleOptions.map((poule) => (_jsx("option", { value: poule.toLowerCase(), children: poule }, poule)))] })] })] })] }), _jsx("div", { "data-testid": "planning-list", children: _jsx(List, { items: filteredMatches, fields: fields, sort: effectiveSort, alignCenter: true, renderLeading: renderLeading, cardClassName: (item) => `${item.status === "ongoing" ? "live-pulse-card !border-amber-300/60" : ""}`, onItemClick: (m) => navigate(`/matches/${m.id}`) }) })] }))] }));
}
