import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from "react-router-dom";
import { useMatch } from "../hooks/useMatches";
import Spinner from "../components/ds/Spinner";
import Card from "../components/ds/Card";
import Badge from "../components/ds/Badge";
export default function MatchDetailPage() {
    const { id } = useParams();
    const { data, isLoading, isError } = useMatch(id);
    if (isLoading) {
        return (_jsxs("div", { className: "flex items-center gap-2 text-slate-300 text-sm", children: [_jsx(Spinner, {}), _jsx("span", { children: "Chargement du match\u2026" })] }));
    }
    if (isError || !data) {
        return _jsx("div", { className: "text-red-400", children: "Match introuvable." });
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("h1", { className: "text-2xl font-semibold", children: [data.teamA, " vs ", data.teamB] }), _jsx(Card, { children: _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "text-sm", children: [_jsx("span", { className: "text-slate-400 mr-2 font-medium", children: "Date :" }), new Date(data.date).toLocaleString()] }), _jsxs("div", { className: "text-sm", children: [_jsx("span", { className: "text-slate-400 mr-2 font-medium", children: "Statut :" }), _jsx(Badge, { color: "accent", children: data.status })] })] }) })] }));
}
