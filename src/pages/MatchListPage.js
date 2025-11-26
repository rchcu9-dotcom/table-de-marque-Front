import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import List from "../components/collections/List";
import Badge from "../components/ds/Badge";
import Spinner from "../components/ds/Spinner";
import { useMatches } from "../hooks/useMatches";
import { useNavigate } from "react-router-dom";
export default function MatchListPage() {
    const { data, isLoading, isError } = useMatches();
    const navigate = useNavigate();
    const fields = [
        {
            key: "teamA",
            label: "Match",
            render: (_value, item) => `${item.teamA} vs ${item.teamB}`,
        },
        {
            key: "date",
            label: "Date",
            secondary: true,
            render: (value) => new Date(value).toLocaleString(),
        },
        {
            key: "status",
            label: "Statut",
            secondary: true,
            render: (value) => {
                const map = {
                    planned: "Prévu",
                    ongoing: "En cours",
                    finished: "Terminé",
                    deleted: "Supprimé",
                };
                return _jsx(Badge, { color: "accent", children: map[value] });
            },
        },
    ];
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Liste des matchs" }), isLoading && (_jsxs("div", { className: "flex items-center gap-2 text-slate-300 text-sm", children: [_jsx(Spinner, {}), _jsx("span", { children: "Chargement\u2026" })] })), isError && (_jsx("div", { className: "text-red-400 text-sm", children: "Erreur de chargement." })), data && data.length === 0 && (_jsx("div", { className: "text-slate-400 text-sm", children: "Aucun match." })), data && data.length > 0 && (_jsx(List, { items: data, fields: fields, onItemClick: (m) => navigate(`/matches/${m.id}`) }))] }));
}
