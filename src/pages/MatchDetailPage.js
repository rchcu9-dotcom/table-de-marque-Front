import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from "react-router-dom";
import { useMatch } from "../hooks/useMatches";
import Spinner from "../components/ds/Spinner";
import Card from "../components/ds/Card";
import Badge from "../components/ds/Badge";
import HexBadge from "../components/ds/HexBadge";
export default function MatchDetailPage() {
    const { id } = useParams();
    const { data, isLoading, isError } = useMatch(id);
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
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx(HexBadge, { name: data.teamA, imageUrl: data.teamALogo ?? undefined, size: 64 }), _jsxs("div", { className: "flex flex-col", children: [_jsx("div", { className: "text-xs uppercase text-slate-500", children: "Match" }), _jsxs("div", { className: "text-2xl font-semibold", children: [_jsx("span", { className: winner === "A" ? "text-emerald-300 font-semibold" : "", children: data.teamA }), " ", "vs", " ", _jsx("span", { className: winner === "B" ? "text-emerald-300 font-semibold" : "", children: data.teamB })] })] }), _jsx(HexBadge, { name: data.teamB, imageUrl: data.teamBLogo ?? undefined, size: 64 })] }), _jsx(Card, { children: _jsxs("div", { className: "space-y-3 text-sm text-slate-200", children: [_jsx("div", { className: "text-base", children: new Date(data.date).toLocaleString() }), _jsx("div", { className: "flex items-center gap-2", children: _jsx(Badge, { color: "accent", children: statusLabels[data.status] }) }), hasScore && (_jsx("div", { className: "text-sm", children: _jsxs("span", { "data-testid": "match-score", className: "inline-flex items-center gap-2 px-2 py-1 rounded-md bg-slate-800 text-slate-100 font-semibold", children: [_jsx("span", { className: winner === "A" ? "text-emerald-300" : "", children: data.teamA }), _jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-xs", children: [_jsx("span", { children: data.scoreA }), _jsx("span", { className: "text-slate-500", children: "-" }), _jsx("span", { children: data.scoreB })] }), _jsx("span", { className: winner === "B" ? "text-emerald-300" : "", children: data.teamB })] }) }))] }) })] }));
}
