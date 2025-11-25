import { Routes, Route } from "react-router-dom";
import LayoutRoot from "../components/layout/LayoutRoot";
import MatchListPage from "../pages/MatchListPage";
import MatchDetailPage from "../pages/MatchDetailPage";
import NotFoundPage from "../pages/NotFoundPage";

export default function AppRouter() {
  return (
    <LayoutRoot>
      <Routes>
        <Route path="/" element={<MatchListPage />} />
        <Route path="/matches/:id" element={<MatchDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </LayoutRoot>
  );
}
