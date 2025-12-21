import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import LayoutRoot from "../components/layout/LayoutRoot";
import MatchListPage from "../pages/MatchListPage";
import MatchDetailPage from "../pages/MatchDetailPage";
import TeamPage from "../pages/TeamPage";
import NotFoundPage from "../pages/NotFoundPage";
import SearchBar from "../components/ds/SearchBar";
import Button from "../components/ds/Button";
import type { SortConfig } from "../components/collections/List";
import type { Match } from "../api/match";

export default function AppRouter() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortConfig<Match>>({
    key: "date",
    direction: "asc",
  });

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LayoutRoot
            topBarContent={
              <SearchBar
                value={searchQuery}
                placeholder="Rechercher un match (equipe ou identifiant)"
                onChange={setSearchQuery}
                onReset={() => setSearchQuery("")}
              />
            }
          >
            <MatchListPage
              searchQuery={searchQuery}
              sort={sort}
              onSortChange={setSort}
            />
          </LayoutRoot>
        }
      />
      <Route
        path="/matches/:id"
        element={
          <LayoutRoot topBarContent={<BackToListButton />}>
            <MatchDetailPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/teams/:id"
        element={
          <LayoutRoot topBarContent={<BackToListButton />}>
            <TeamPage />
          </LayoutRoot>
        }
      />
      <Route
        path="*"
        element={
          <LayoutRoot>
            <NotFoundPage />
          </LayoutRoot>
        }
      />
    </Routes>
  );
}

function BackToListButton() {
  const navigate = useNavigate();
  return (
    <Button variant="ghost" onClick={() => navigate("/")}>
      Retour aux matchs
    </Button>
  );
}
