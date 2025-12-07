import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import HexBadge from "../ds/HexBadge";
import Badge from "../ds/Badge";
const statusBadgeColor = {
    planned: "muted",
    ongoing: "warning",
    finished: "success",
    deleted: "muted",
};
function resolveScoreTone(match, focusTeam) {
    if (match.scoreA === null ||
        match.scoreB === null ||
        (match.status !== "ongoing" && match.status !== "finished")) {
        return statusBadgeColor[match.status];
    }
    const isTeamA = focusTeam
        ? match.teamA.toLowerCase() === focusTeam.toLowerCase()
        : true;
    const scoreFor = isTeamA ? match.scoreA : match.scoreB;
    const scoreAgainst = isTeamA ? match.scoreB : match.scoreA;
    if (scoreFor > scoreAgainst)
        return "success";
    if (scoreFor < scoreAgainst)
        return "default"; // use default as "red" substitute below
    return "muted";
}
function toneClass(tone) {
    if (tone === "success")
        return "bg-slate-900/80 border border-emerald-400 text-emerald-200";
    if (tone === "warning")
        return "bg-slate-900/80 border border-amber-400 text-amber-200";
    if (tone === "muted")
        return "bg-slate-900/80 border border-slate-600 text-slate-200";
    return "bg-slate-900/80 border border-rose-400 text-rose-200";
}
export default function MatchSummaryGrid({ matches, currentMatchId, onSelect, focusTeam }) {
    if (!matches || matches.length === 0)
        return null;
    return (_jsxs("div", { className: "relative", "data-testid": "summary-grid", children: [_jsx("div", { className: "pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-slate-950 to-transparent" }), _jsx("div", { className: "pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-slate-950 to-transparent" }), _jsx("div", { className: "flex gap-2 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory justify-center", children: matches.map((m) => {
                    const hasScore = (m.status === "ongoing" || m.status === "finished") &&
                        m.scoreA !== null &&
                        m.scoreB !== null;
                    const tone = resolveScoreTone(m, focusTeam);
                    return (_jsxs("div", { "data-testid": `summary-card-${m.id}`, className: `snap-center min-w-[90px] max-w-[100px] flex-shrink-0 rounded-xl border border-slate-800 bg-slate-900/80 px-2 py-2 shadow-inner shadow-slate-950 flex flex-col items-center gap-1 cursor-pointer transition hover:-translate-y-0.5 ${m.id === currentMatchId ? "!border-emerald-400/70" : ""}`, onClick: () => onSelect?.(m.id), children: [_jsxs("div", { className: "flex items-center justify-center w-full gap-1", children: [_jsx(HexBadge, { name: m.teamA, imageUrl: m.teamALogo ?? undefined, size: 26 }), _jsx(HexBadge, { name: m.teamB, imageUrl: m.teamBLogo ?? undefined, size: 26 })] }), hasScore ? (_jsxs("span", { "data-testid": `summary-score-${m.id}`, className: `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${toneClass(tone)}`, children: [_jsx("span", { children: m.scoreA }), _jsx("span", { className: "text-slate-500", children: "-" }), _jsx("span", { children: m.scoreB })] })) : (_jsx(Badge, { color: statusBadgeColor[m.status], children: "A jouer" }))] }, m.id));
                }) })] }));
}
