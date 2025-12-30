import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import LayoutRoot from "../components/layout/LayoutRoot";
import MatchListPage from "../pages/MatchListPage";
import MatchDetailPage from "../pages/MatchDetailPage";
import TeamPage from "../pages/TeamPage";
import NotFoundPage from "../pages/NotFoundPage";
import HomePage from "../pages/HomePage";
import TeamsPage from "../pages/TeamsPage";
import Tournament5v5Page from "../pages/Tournament5v5Page";
import ChallengePage from "../pages/ChallengePage";
import ThreeVThreePage from "../pages/ThreeVThreePage";
import ChallengeDetailPage from "../pages/ChallengeDetailPage";
import PlanningPage from "../pages/PlanningPage";
import ChallengeAtelierPage from "../pages/ChallengeAtelierPage";
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
          <LayoutRoot>
            <HomePage />
          </LayoutRoot>
        }
      />
      <Route
        path="/planning"
        element={
          <LayoutRoot>
            <PlanningPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/teams"
        element={
          <LayoutRoot>
            <TeamsPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/tournament/5v5"
        element={
          <LayoutRoot>
            <Tournament5v5Page />
          </LayoutRoot>
        }
      />
      <Route
        path="/challenge"
        element={
          <LayoutRoot>
            <ChallengePage />
          </LayoutRoot>
        }
      />
      <Route
        path="/challenge/atelier/:type"
        element={
          <LayoutRoot>
            <ChallengeAtelierPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/challenge/:id"
        element={
          <LayoutRoot topBarContent={<BackToListButton />}>
            <ChallengeDetailPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/tournament/3v3"
        element={
          <LayoutRoot>
            <ThreeVThreePage />
          </LayoutRoot>
        }
      />
      <Route
        path="/matches"
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
      Retour
    </Button>
  );
}
