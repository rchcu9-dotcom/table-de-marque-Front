import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function DataTable({ items, columns }) {
    return (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { children: _jsx("tr", { className: "border-b border-slate-800", children: columns.map((col) => (_jsx("th", { className: "text-left py-2 px-3 font-semibold text-slate-300", children: col.label }, String(col.key)))) }) }), _jsx("tbody", { children: items.map((item, idx) => (_jsx("tr", { className: "border-b border-slate-900", children: columns.map((col) => {
                            const value = item[col.key];
                            return (_jsx("td", { className: "py-2 px-3 text-slate-300", children: col.render ? col.render(value, item) : String(value ?? "") }, String(col.key)));
                        }) }, idx))) })] }) }));
}
