import { jsx as _jsx } from "react/jsx-runtime";
import Card from "../ds/Card";
export default function ResponsiveCard({ item, render }) {
    return (_jsx(Card, { className: "w-full", children: render(item) }));
}
