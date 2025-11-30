import { jsx as _jsx } from "react/jsx-runtime";
import clsx from "clsx";
export default function Card({ children, className, onClick }) {
    return (_jsx("div", { className: clsx("rounded-2xl border border-slate-800 bg-slate-900/60 p-4", className), onClick: onClick, children: children }));
}
