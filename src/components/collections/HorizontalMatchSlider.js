import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import HexBadge from "../ds/HexBadge";
const statusColors = {
    planned: "bg-slate-800 text-slate-200",
    ongoing: "bg-amber-400/90 text-slate-900",
    finished: "bg-sky-400/90 text-slate-900",
    deleted: "bg-slate-700 text-slate-200",
};
export default function HorizontalMatchSlider({ matches, currentMatchId, onSelect }) {
    if (!matches || matches.length === 0)
        return null;
    const sliderRef = React.useRef(null);
    const cardRefs = React.useRef({});
    const selectedBorder = (m) => {
        if (m.status === "ongoing")
            return "!border-amber-300/80";
        if (m.status === "finished")
            return "!border-sky-400/80";
        return "!border-slate-600/80";
    };
    React.useEffect(() => {
        if (!sliderRef.current || !currentMatchId)
            return;
        const target = cardRefs.current[currentMatchId];
        if (!target)
            return;
        const container = sliderRef.current;
        const targetCenter = target.offsetLeft + target.offsetWidth / 2;
        const scrollLeft = Math.max(targetCenter - container.clientWidth / 2, 0);
        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }, [matches, currentMatchId]);
    return (_jsxs("div", { className: "relative", children: [_jsx("div", { className: "pointer-events-none absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-slate-950 to-transparent" }), _jsx("div", { className: "pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-slate-950 to-transparent" }), _jsx("div", { ref: sliderRef, className: "flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory", children: matches.map((m) => (_jsxs("div", { "data-testid": `poule-slider-card-${m.id}`, ref: (el) => {
                        cardRefs.current[m.id] = el;
                    }, className: `snap-center min-w-[220px] max-w-[240px] flex-shrink-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-inner shadow-slate-950 cursor-pointer hover:-translate-y-0.5 transition ${m.id === currentMatchId ? selectedBorder(m) : ""} ${m.status === "ongoing" ? "live-pulse-card" : ""}`, onClick: () => onSelect?.(m.id), children: [_jsx("div", { className: "flex items-center justify-end text-xs text-slate-400", children: _jsxs("span", { className: `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${statusColors[m.status]}`, children: [m.status === "planned" && "Planifie", m.status === "ongoing" && "En cours", m.status === "finished" && "Termine", m.status === "deleted" && "Supprime"] }) }), _jsx("div", { className: "mt-2 text-sm font-semibold text-slate-100 text-center", children: new Date(m.date).toLocaleString() }), _jsxs("div", { className: "mt-3 flex items-center justify-between gap-2", children: [_jsx(HexBadge, { name: m.teamA, imageUrl: m.teamALogo ?? undefined, size: 40 }), _jsxs("div", { className: "flex-1 text-center", children: [_jsx("div", { className: "text-[13px] font-semibold text-slate-100", children: m.teamA }), _jsx("div", { className: "text-[11px] text-slate-500", children: "vs" }), _jsx("div", { className: "text-[13px] font-semibold text-slate-100", children: m.teamB })] }), _jsx(HexBadge, { name: m.teamB, imageUrl: m.teamBLogo ?? undefined, size: 40 })] }), (m.status === "ongoing" || m.status === "finished") &&
                            m.scoreA !== null &&
                            m.scoreB !== null && (_jsx("div", { className: "mt-3 flex items-center justify-center", children: _jsxs("span", { className: `inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-100 ${m.status === "ongoing" ? "live-pulse-card" : ""}`, children: [_jsx("span", { children: m.scoreA }), _jsx("span", { className: "text-slate-500", children: "-" }), _jsx("span", { children: m.scoreB })] }) }))] }, m.id))) })] }));
}
