import React from "react";
import { Routes, Route } from "react-router-dom";
import LayoutRoot from "../components/layout/LayoutRoot";
import MatchListPage from "../pages/MatchListPage";
import MatchDetailPage from "../pages/MatchDetailPage";
import TeamPage from "../pages/TeamPage";
import NotFoundPage from "../pages/NotFoundPage";
import HomePage from "../pages/HomePage";
import PresentationTournoiPage from "../pages/PresentationTournoiPage";
import { useInscriptionSession } from "../hooks/useInscriptionSession";
import Accueil2Page from "../pages/Accueil2Page";
import Accueil2BroadcastPage from "../pages/Accueil2BroadcastPage";
import Accueil2PremiumPage from "../pages/Accueil2PremiumPage";
import Accueil2KiosquePage from "../pages/Accueil2KiosquePage";
import TeamsPage from "../pages/TeamsPage";
import Tournament5v5Page from "../pages/Tournament5v5Page";
import ChallengePage from "../pages/ChallengePage";
import ThreeVThreePage from "../pages/ThreeVThreePage";
import ChallengeDetailPage from "../pages/ChallengeDetailPage";
import ChallengeEquipePage from "../pages/ChallengeEquipePage";
import PlanningPage from "../pages/PlanningPage";
import TournamentTimelinePage from "../pages/TournamentTimelinePage";
import PlanningCalendairePage from "../pages/PlanningCalendairePage";
import ChallengeAtelierPage from "../pages/ChallengeAtelierPage";
import ChallengeFinaleCombiPage from "../pages/ChallengeFinaleCombiPage";
import ChallengeFinaleAtelierGardienPage from "../pages/ChallengeFinaleAtelierGardienPage";
import LivePage from "../pages/LivePage";
import InscriptionPage from "../pages/InscriptionPage";
import AuthCallbackPage from "../pages/AuthCallbackPage";
import TableDeMarqueOperatorPage from "../pages/TableDeMarqueOperatorPage";
import ParametresSportifsPage from "../pages/ParametresSportifsPage";
import ParametresInscriptionPage from "../pages/ParametresInscriptionPage";
import ParametresPresentationPage from "../pages/ParametresPresentationPage";
import PlanningSimulationPage from "../pages/PlanningSimulationPage";
import FormatCompetitionBuilderPage from "../pages/FormatCompetitionBuilderPage";
import ConnexionPage from "../pages/ConnexionPage";
import ProfilPage from "../pages/ProfilPage";
import AdminPage from "../pages/AdminPage";
import SearchBar from "../components/ds/SearchBar";
import type { SortConfig } from "../components/collections/List";
import type { Match } from "../api/match";

export default function AppRouter() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortConfig<Match>>({
    key: "date",
    direction: "asc",
  });
  const { etape } = useInscriptionSession();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LayoutRoot fullBleed={etape === "INSCRIPTIONS_OUVERTES"}>
            {etape === "INSCRIPTIONS_OUVERTES" ? <PresentationTournoiPage /> : <HomePage />}
          </LayoutRoot>
        }
      />
      <Route
        path="/accueil-2"
        element={
          <LayoutRoot>
            <Accueil2Page />
          </LayoutRoot>
        }
      />
      <Route
        path="/accueil-2-broadcast"
        element={
          <LayoutRoot>
            <Accueil2BroadcastPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/accueil-2-premium"
        element={
          <LayoutRoot>
            <Accueil2PremiumPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/accueil-2-kiosque"
        element={
          <LayoutRoot>
            <Accueil2KiosquePage />
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
        path="/live"
        element={
          <LayoutRoot>
            <LivePage />
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
        path="/challenge/finale-combine"
        element={
          <LayoutRoot>
            <ChallengeFinaleCombiPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/challenge/finale-atelier-gardien"
        element={
          <LayoutRoot>
            <ChallengeFinaleAtelierGardienPage />
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
        path="/challenge/equipe/:teamId"
        element={
          <LayoutRoot>
            <ChallengeEquipePage />
          </LayoutRoot>
        }
      />
      <Route
        path="/challenge/:id"
        element={
          <LayoutRoot>
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
          <LayoutRoot>
            <MatchDetailPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/teams/:id"
        element={
          <LayoutRoot>
            <TeamPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/auth/callback"
        element={<AuthCallbackPage />}
      />
      <Route
        path="/inscription"
        element={
          <LayoutRoot>
            <InscriptionPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/connexion"
        element={
          <LayoutRoot>
            <ConnexionPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/profil"
        element={
          <LayoutRoot>
            <ProfilPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/admin"
        element={
          <LayoutRoot>
            <AdminPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/table-de-marque"
        element={
          <LayoutRoot>
            <TableDeMarqueOperatorPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/admin/parametres-sportifs"
        element={
          <LayoutRoot>
            <ParametresSportifsPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/admin/parametres-inscription"
        element={
          <LayoutRoot>
            <ParametresInscriptionPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/admin/presentation-tournoi"
        element={
          <LayoutRoot>
            <ParametresPresentationPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/admin/planning/simulation"
        element={
          <LayoutRoot>
            <PlanningSimulationPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/admin/format-competition"
        element={
          <LayoutRoot>
            <FormatCompetitionBuilderPage />
          </LayoutRoot>
        }
      />
      <Route
        path="/planning/calendaire"
        element={
          <LayoutRoot>
            <PlanningCalendairePage />
          </LayoutRoot>
        }
      />
      <Route
        path="/planning/live"
        element={
          <LayoutRoot>
            <TournamentTimelinePage />
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
