import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import clsx from "clsx";
export default function SearchBar({ value, placeholder, className, onChange, onReset }) {
    const handleReset = () => {
        onChange("");
        onReset?.();
    };
    return (_jsxs("div", { className: clsx("group flex w-full max-w-xl items-center gap-2 rounded-full border border-slate-800/90 bg-gradient-to-r from-slate-950/90 via-slate-900/70 to-slate-950/90 px-3 py-2 shadow-lg shadow-slate-950/50 backdrop-blur", className), children: [_jsx("span", { className: "inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 text-blue-300 ring-1 ring-inset ring-blue-500/40 transition-all group-hover:ring-blue-400/70", children: _jsx("svg", { "aria-hidden": true, viewBox: "0 0 20 20", className: "h-4 w-4 fill-current", children: _jsx("path", { d: "M14.78 13.72 18 17l-1 1-3.22-3.28a7 7 0 1 1 1-1Zm-6.78.78a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" }) }) }), _jsx("input", { value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder, "aria-label": "Rechercher un match", className: "flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none", type: "search" }), value && (_jsx("button", { type: "button", onClick: handleReset, className: "inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition", "aria-label": "Effacer la recherche", children: "\u00d7" }))] }));
}
