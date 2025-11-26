import { jsx as _jsx } from "react/jsx-runtime";
import Card from "../ds/Card";
export default function Grid({ items, renderItem }) {
    return (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: items.map((item, idx) => (_jsx(Card, { children: renderItem(item) }, idx))) }));
}
