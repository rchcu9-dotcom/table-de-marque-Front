import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMatch, useMatches } from "../hooks/useMatches";
import Spinner from "../components/ds/Spinner";
import Card from "../components/ds/Card";
import Badge from "../components/ds/Badge";
import HexBadge from "../components/ds/HexBadge";
import DataTable from "../components/collections/DataTable";
import HorizontalMatchSlider from "../components/collections/HorizontalMatchSlider";
import MatchSummaryGrid from "../components/collections/MatchSummaryGrid";
import { useClassementForMatch } from "../hooks/useClassement";
export default function MatchDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, isLoading, isError } = useMatch(id);
    const { data: allMatches } = useMatches();
    const { data: classement, isLoading: isClassementLoading, isError: isClassementError, } = useClassementForMatch(id);
    const pouleKey = (data?.pouleName || data?.pouleCode || "").trim().toLowerCase();
    const pouleMatches = React.useMemo(() => {
        if (!allMatches || !pouleKey)
            return [];
        return [...allMatches]
            .filter((m) => (m.pouleName || m.pouleCode || "").trim().toLowerCase() === pouleKey)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [allMatches, pouleKey]);
    if (isLoading) {
        return (_jsxs("div", { className: "flex items-center gap-2 text-slate-300 text-sm", children: [_jsx(Spinner, {}), _jsx("span", { children: "Chargement du match..." })] }));
    }
    if (isError || !data) {
        return _jsx("div", { className: "text-red-400", children: "Match introuvable." });
    }
    const hasScore = (data.status === "ongoing" || data.status === "finished") &&
        data.scoreA !== null &&
        data.scoreB !== null;
    const winner = hasScore && data.scoreA !== null && data.scoreB !== null && data.scoreA !== data.scoreB
        ? data.scoreA > data.scoreB
            ? "A"
            : "B"
        : null;
    const statusLabels = {
        planned: "Planifie",
        ongoing: "En cours",
        finished: "Termine",
        deleted: "Supprime",
    };
    const statusColors = {
        planned: "muted",
        ongoing: "warning",
        finished: "info",
        deleted: "muted",
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-center gap-6", children: [_jsx(HexBadge, { name: data.teamA, imageUrl: data.teamALogo ?? undefined, size: 64 }), _jsxs("div", { className: "flex flex-col items-center text-center", children: [_jsx("div", { className: "text-xs uppercase text-slate-500", children: "Match" }), _jsxs("div", { className: "text-2xl font-semibold", children: [_jsx("span", { className: winner === "A" ? "text-emerald-300 font-semibold" : "", children: data.teamA }), " ", "vs", " ", _jsx("span", { className: winner === "B" ? "text-emerald-300 font-semibold" : "", children: data.teamB })] })] }), _jsx(HexBadge, { name: data.teamB, imageUrl: data.teamBLogo ?? undefined, size: 64 })] }), _jsx(Card, { className: data.status === "ongoing" ? "live-pulse-card" : "", children: _jsxs("div", { className: "space-y-3 text-sm text-slate-200 flex flex-col items-center text-center", children: [_jsx("div", { className: "text-base", children: new Date(data.date).toLocaleString() }), (data.pouleName || data.pouleCode) && (_jsxs("div", { className: "text-xs text-slate-400", children: ["Poule ", data.pouleName || data.pouleCode] })), _jsx("div", { className: "flex items-center gap-2", children: _jsx(Badge, { color: statusColors[data.status], children: statusLabels[data.status] }) }), hasScore && (_jsx("div", { className: "text-sm", children: _jsxs("span", { "data-testid": "match-score", className: "inline-flex items-center gap-2 px-2 py-1 rounded-md bg-slate-800 text-slate-100 font-semibold", children: [_jsx("span", { className: winner === "A" ? "text-emerald-300" : "", children: data.teamA }), _jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-xs", children: [_jsx("span", { children: data.scoreA }), _jsx("span", { className: "text-slate-500", children: "-" }), _jsx("span", { children: data.scoreB })] }), _jsx("span", { className: winner === "B" ? "text-emerald-300" : "", children: data.teamB })] }) }))] }) }), pouleMatches.length > 0 && (_jsx(Card, { "data-testid": "summary-section", children: _jsxs("div", { className: "space-y-4", children: [_jsx("div", { "data-testid": "summary-grid-teamA", children: _jsx(MatchSummaryGrid, { matches: pouleMatches.filter((m) => m.teamA.toLowerCase() === data.teamA.toLowerCase() ||
                                    m.teamB.toLowerCase() === data.teamA.toLowerCase()), currentMatchId: data.id, focusTeam: data.teamA, onSelect: (targetId) => navigate(`/matches/${targetId}`) }) }), _jsx("div", { "data-testid": "summary-grid-teamB", children: _jsx(MatchSummaryGrid, { matches: pouleMatches.filter((m) => m.teamA.toLowerCase() === data.teamB.toLowerCase() ||
                                    m.teamB.toLowerCase() === data.teamB.toLowerCase()), currentMatchId: data.id, focusTeam: data.teamB, onSelect: (targetId) => navigate(`/matches/${targetId}`) }) })] }) })), _jsx(Card, { "data-testid": "classement-section", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-base font-semibold text-slate-100", children: "Classement" }), _jsx("div", { className: "text-xs text-slate-500", children: "Actualisation auto (60s)" })] }), isClassementLoading && (_jsxs("div", { className: "flex items-center gap-2 text-slate-300 text-sm", children: [_jsx(Spinner, {}), _jsx("span", { children: "Chargement du classement..." })] })), isClassementError && (_jsx("div", { className: "text-red-400 text-sm", children: "Classement indisponible." })), classement && (_jsx(DataTable, { items: classement.equipes, columns: [
                                { key: "rang", label: "Pos" },
                                {
                                    key: "name",
                                    label: "Equipe",
                                    render: (_value, item) => (_jsxs("div", { className: "flex items-center gap-3", children: [item.logoUrl ? (_jsx("img", { src: item.logoUrl, alt: item.name, className: "h-6 w-6 rounded-full object-cover bg-slate-800" })) : (_jsx("div", { className: "h-6 w-6 rounded-full bg-slate-800" })), _jsx("span", { children: item.name })] })),
                                },
                                { key: "points", label: "Pts" },
                                { key: "victoires", label: "V" },
                                { key: "nuls", label: "N" },
                                { key: "defaites", label: "D" },
                                { key: "diff", label: "Diff." },
                            ] }))] }) }), pouleMatches.length > 0 && (_jsx(Card, { "data-testid": "poule-slider", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "text-base font-semibold text-slate-100", children: ["Matchs de la poule ", pouleMatches[0]?.pouleName || pouleMatches[0]?.pouleCode || ""] }), _jsx("div", { className: "text-xs text-slate-500", children: "Glissez horizontalement" })] }), _jsx(HorizontalMatchSlider, { matches: pouleMatches, currentMatchId: data.id, onSelect: (targetId) => navigate(`/matches/${targetId}`) })] }) }))] }));
}
