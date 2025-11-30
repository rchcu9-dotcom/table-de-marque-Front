import { jsx as _jsx } from "react/jsx-runtime";
export default function TopBar({ children }) {
    return (_jsx("header", { className: "h-14 border-b border-slate-800 flex items-center px-4", children: _jsx("div", { className: "flex items-center gap-2 w-full", children: children ?? _jsx("span", { className: "font-semibold", children: "Table de marque" }) }) }));
}
