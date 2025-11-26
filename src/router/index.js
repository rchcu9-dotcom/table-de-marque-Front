import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route } from "react-router-dom";
import LayoutRoot from "../components/layout/LayoutRoot";
import MatchListPage from "../pages/MatchListPage";
import MatchDetailPage from "../pages/MatchDetailPage";
import NotFoundPage from "../pages/NotFoundPage";
export default function AppRouter() {
    return (_jsx(LayoutRoot, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(MatchListPage, {}) }), _jsx(Route, { path: "/matches/:id", element: _jsx(MatchDetailPage, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFoundPage, {}) })] }) }));
}
