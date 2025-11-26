import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Page({ title, actions, children }) {
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-xl font-semibold", children: title }), actions && _jsx("div", { children: actions })] }), _jsx("div", { children: children })] }));
}
