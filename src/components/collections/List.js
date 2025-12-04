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
export default function List({ items, fields, sort, onItemClick, renderLeading, alignCenter, itemTestIdPrefix, cardClassName, }) {
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
    const resolveCardClassName = React.useCallback((item) => typeof cardClassName === "function" ? cardClassName(item) : (cardClassName ?? ""), [cardClassName]);
    return (_jsx("div", { className: `space-y-3 ${alignCenter ? "flex flex-col items-center w-full" : ""}`, children: sortedItems.map((item, idx) => {
            const primary = fields.find((f) => !f.secondary);
            const secondaryFields = fields.filter((f) => f.secondary);
            const itemCardClass = resolveCardClassName(item);
            return (_jsx(Card, { className: `${itemCardClass} ${onItemClick ? "cursor-pointer hover:bg-slate-800/80" : ""} ${alignCenter ? "flex flex-col items-center text-center w-full" : ""}`, "data-testid": itemTestIdPrefix ? `${itemTestIdPrefix}${item.id ?? idx}` : undefined, onClick: () => onItemClick?.(item), children: _jsxs("div", { className: `flex w-full flex-col gap-1 ${alignCenter ? "items-center text-center" : ""}`, children: [renderLeading && (_jsx("div", { className: `mb-2 flex items-center ${alignCenter ? "w-full justify-center" : ""}`, children: renderLeading(item) })), primary && (_jsx("div", { className: `text-sm font-semibold ${alignCenter ? "w-full text-center" : ""}`, children: primary.render
                                ? primary.render(item[primary.key], item)
                                : String(item[primary.key]) })), secondaryFields.length > 0 && (_jsx("div", { className: `text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1 ${alignCenter ? "justify-center w-full text-center" : ""}`, children: secondaryFields.map((f) => (_jsxs("span", { className: "inline-flex items-center gap-1", children: [!f.hideLabel && f.label && (_jsxs("span", { className: "font-medium text-slate-500 mr-1", children: [f.label, ":"] })), f.render
                                        ? f.render(item[f.key], item)
                                        : String(item[f.key] ?? "")] }, String(f.key)))) }))] }) }, item.id ?? idx));
        }) }));
}
