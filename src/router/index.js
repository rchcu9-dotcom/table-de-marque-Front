import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import LayoutRoot from "../components/layout/LayoutRoot";
import MatchListPage from "../pages/MatchListPage";
import MatchDetailPage from "../pages/MatchDetailPage";
import NotFoundPage from "../pages/NotFoundPage";
import SearchBar from "../components/ds/SearchBar";
import Button from "../components/ds/Button";
export default function AppRouter() {
    const [searchQuery, setSearchQuery] = React.useState("");
    const [sort, setSort] = React.useState({
        key: "date",
        direction: "asc",
    });
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(LayoutRoot, { topBarContent: _jsx(SearchBar, { value: searchQuery, placeholder: "Rechercher un match (equipe ou identifiant)", onChange: setSearchQuery, onReset: () => setSearchQuery("") }), children: _jsx(MatchListPage, { searchQuery: searchQuery, sort: sort, onSortChange: setSort }) }) }), _jsx(Route, { path: "/matches/:id", element: _jsx(LayoutRoot, { topBarContent: _jsx(BackToListButton, {}), children: _jsx(MatchDetailPage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(LayoutRoot, { children: _jsx(NotFoundPage, {}) }) })] }));
}
function BackToListButton() {
    const navigate = useNavigate();
    return (_jsx(Button, { variant: "ghost", onClick: () => navigate("/"), children: "Retour aux matchs" }));
}
