import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import Card from "../ds/Card";
const normalizeValue = (value) => {
    if (value instanceof Date)
        return value.getTime();
    if (typeof value === "string") {
        const parsedDate = Date.parse(value);
        if (!Number.isNaN(parsedDate))
            return parsedDate;
        return value.toLowerCase();
    }
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && value !== "")
        return numeric;
    return value ?? "";
};
export default function List({ items, fields, sort, onItemClick, }) {
    const sortedItems = React.useMemo(() => {
        if (!sort)
            return items;
        const { key, direction, compare } = sort;
        const comparator = compare ??
            ((a, b) => {
                const left = normalizeValue(a[key]);
                const right = normalizeValue(b[key]);
                if (left < right)
                    return -1;
                if (left > right)
                    return 1;
                return 0;
            });
        const factor = direction === "asc" ? 1 : -1;
        return [...items].sort((a, b) => comparator(a, b) * factor);
    }, [items, sort]);
    return (_jsx("div", { className: "space-y-3", children: sortedItems.map((item, idx) => {
            const primary = fields.find((f) => !f.secondary);
            const secondaryFields = fields.filter((f) => f.secondary);
            return (_jsx(Card, { className: onItemClick ? "cursor-pointer hover:bg-slate-800/80" : "", onClick: () => onItemClick?.(item), children: _jsxs("div", { className: "flex flex-col gap-1", children: [primary && (_jsx("div", { className: "text-sm font-semibold", children: primary.render
                                ? primary.render(item[primary.key], item)
                                : String(item[primary.key]) })), secondaryFields.length > 0 && (_jsx("div", { className: "text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1", children: secondaryFields.map((f) => (_jsxs("span", { className: "inline-flex items-center gap-1", children: [!f.hideLabel && f.label && (_jsxs("span", { className: "font-medium text-slate-500 mr-1", children: [f.label, ":"] })), f.render
                                        ? f.render(item[f.key], item)
                                        : String(item[f.key] ?? "")] }, String(f.key)))) }))] }) }, item.id ?? idx));
        }) }));
}
