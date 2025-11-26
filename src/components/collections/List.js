import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Card from "../ds/Card";
export default function List({ items, fields, onItemClick, }) {
    return (_jsx("div", { className: "space-y-3", children: items.map((item, idx) => {
            const primary = fields.find((f) => !f.secondary);
            const secondaryFields = fields.filter((f) => f.secondary);
            return (_jsx(Card, { className: onItemClick ? "cursor-pointer hover:bg-slate-800/80" : "", onClick: () => onItemClick?.(item), children: _jsxs("div", { className: "flex flex-col gap-1", children: [primary && (_jsx("div", { className: "text-sm font-semibold", children: primary.render
                                ? primary.render(item[primary.key], item)
                                : String(item[primary.key]) })), secondaryFields.length > 0 && (_jsx("div", { className: "text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1", children: secondaryFields.map((f) => (_jsxs("span", { children: [_jsxs("span", { className: "font-medium text-slate-500 mr-1", children: [f.label, ":"] }), f.render
                                        ? f.render(item[f.key], item)
                                        : String(item[f.key] ?? "")] }, String(f.key)))) }))] }) }, item.id ?? idx));
        }) }));
}
