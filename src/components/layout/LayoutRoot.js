import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import TopBar from "./TopBar";
export default function LayoutRoot({ children, topBarContent }) {
    return (_jsxs("div", { className: "min-h-screen bg-slate-950 text-slate-100", children: [_jsx(TopBar, { children: topBarContent }), _jsx("main", { className: "p-4", children: children })] }));
}
