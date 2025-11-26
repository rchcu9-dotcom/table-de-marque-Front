import { jsx as _jsx } from "react/jsx-runtime";
import clsx from "clsx";
export default function Badge({ children, color = "default" }) {
    const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
    const variants = {
        default: "bg-slate-800 text-slate-100",
        accent: "bg-emerald-500 text-slate-900",
    };
    return _jsx("span", { className: clsx(base, variants[color]), children: children });
}
