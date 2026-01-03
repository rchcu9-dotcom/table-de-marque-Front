import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useChallengeAll } from "../hooks/useChallengeAll";
import { useTeams } from "../hooks/useTeams";
import { useSelectedTeam } from "../providers/SelectedTeamProvider";
import type { ChallengeAttempt as Attempt } from "../api/challenge";
import challengeIcon from "../assets/icons/nav/challenge.png";
import vitesseIcon from "../assets/icons/nav/vitesse.png";
import tirIcon from "../assets/icons/nav/tir.png";
import agiliteIcon from "../assets/icons/nav/agilite.png";

const ATELIER_LABEL: Record<string, string> = {
  vitesse: "Atelier Vitesse",
  tir: "Atelier Tir",
  glisse_crosse: "Atelier Agilité",
};

export default function ChallengeAtelierPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { selectedTeam } = useSelectedTeam();
  const { data, isLoading, isError } = useChallengeAll();
  const { data: teams } = useTeams();
  const [search, setSearch] = React.useState("");

  const atelierType = type === "tir" || type === "glisse_crosse" || type === "vitesse" ? type : null;

  const teamMap = React.useMemo(() => {
    const map = new Map<string, { name: string; logoUrl?: string | null }>();
    teams?.forEach((t) => map.set(t.id.toLowerCase(), { name: t.name, logoUrl: t.logoUrl }));
    return map;
  }, [teams]);

  const attempts = React.useMemo(() => {
    if (!atelierType) return [];
    const items = (data?.jour1 ?? []).filter((a) => a.atelierType === atelierType);
    const filtered = selectedTeam?.id
      ? items.filter((a) => (a.equipeId ?? "").toLowerCase() === selectedTeam.id.toLowerCase())
      : items;
    const term = search.trim().toLowerCase();
    if (!term) return filtered;
    return filtered.filter((a) => {
      const joueur = (a.joueurName ?? "").toLowerCase();
      const equipe = (a.equipeName ?? "").toLowerCase();
      return joueur.includes(term) || equipe.includes(term) || (a.equipeId ?? "").toLowerCase().includes(term);
    });
  }, [atelierType, data?.jour1, search, selectedTeam]);

  const sorted = React.useMemo(() => {
    return [...attempts].sort((a, b) => {
      if (a.metrics.type === "tir" && b.metrics.type === "tir") {
        return b.metrics.totalPoints - a.metrics.totalPoints;
      }
      const ta =
        a.metrics.type === "vitesse"
          ? a.metrics.tempsMs
          : a.metrics.type === "glisse_crosse"
          ? a.metrics.tempsMs + a.metrics.penalites * 5000
          : Number.MAX_SAFE_INTEGER;
      const tb =
        b.metrics.type === "vitesse"
          ? b.metrics.tempsMs
          : b.metrics.type === "glisse_crosse"
          ? b.metrics.tempsMs + b.metrics.penalites * 5000
          : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });
  }, [attempts]);

  const renderMetrics = (m: Attempt) => {
    if (m.metrics.type === "vitesse") return `${(m.metrics.tempsMs / 1000).toFixed(2)} s`;
    if (m.metrics.type === "tir") return `Points: ${m.metrics.totalPoints} (${m.metrics.tirs.join(", ")})`;
    if (m.metrics.type === "glisse_crosse") return `${(m.metrics.tempsMs / 1000).toFixed(2)} s, pénalités: ${m.metrics.penalites}`;
    return "";
  };

  const title = atelierType ? ATELIER_LABEL[atelierType] ?? "Atelier" : "Atelier";
  const headerIcon =
    atelierType === "vitesse" ? vitesseIcon : atelierType === "tir" ? tirIcon : atelierType === "glisse_crosse" ? agiliteIcon : challengeIcon;

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute left-0 right-0 px-4" style={{ top: "72px" }}>
        <div className="relative overflow-hidden max-w-6xl mx-auto rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-md shadow-slate-950">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "url(https://drive.google.com/thumbnail?id=1BlOlsgBPdgob1SgoN3HXcs-PEcUM8TIh&sz=w256)",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right center",
              backgroundSize: "200px",
            }}
          />
          <div className="relative flex items-center gap-3">
            <button
              className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-slate-200 text-sm hover:border-slate-500"
              onClick={() => navigate(-1)}
            >
              Retour
            </button>
            <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-800/80 flex-shrink-0">
              <img src={headerIcon} alt="Challenge" className="h-full w-full object-cover scale-150" loading="lazy" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">{title}</h1>
              {selectedTeam?.name && <p className="text-slate-300 text-sm">{selectedTeam.name}</p>}
            </div>
          </div>
          <div className="relative mt-3 max-w-sm">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer joueur/équipe"
              className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100"
            />
          </div>
        </div>
      </div>

      <div
        className="absolute inset-x-4 bottom-4"
        style={{ top: "200px", height: "calc(100vh - 200px - 24px)" }}
      >
        <div className="max-w-6xl mx-auto h-full rounded-xl border border-slate-800 bg-slate-900/70 p-4 overflow-y-auto space-y-3">
          {isLoading && <p className="text-slate-300 text-sm">Chargement...</p>}
          {isError && <p className="text-red-400 text-sm">Erreur lors du chargement.</p>}
          {!atelierType && <p className="text-slate-300 text-sm">Atelier inconnu.</p>}
          {atelierType && !isLoading && !isError && (
            <div className="space-y-2">
              {sorted.length === 0 ? (
                <p className="text-slate-300 text-sm">Aucune donnée disponible.</p>
              ) : (
                <table className="min-w-full text-xs text-slate-100">
                  <thead className="text-[11px] uppercase text-slate-400">
                    <tr>
                      <th className="py-1 pr-3 text-left w-10">Rang</th>
                      <th className="py-1 pr-3 text-left">Joueur</th>
                      <th className="py-1 text-right">Résultat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-[12px]">
                    {sorted.map((a, idx) => {
                      const eqKey = (a.equipeId ?? "").toLowerCase();
                      const equipe = teamMap.get(eqKey);
                      const rank = idx + 1;
                      return (
                        <tr key={`${a.atelierId}-${a.joueurId}-${idx}`}>
                          <td className="py-1 pr-3 text-slate-200 text-center">{rank}</td>
                          <td className="py-1 pr-3 font-semibold text-slate-100">
                            <span className="inline-flex items-center gap-2">
                              {a.equipeLogoUrl || equipe?.logoUrl ? (
                                <img
                                  src={(a.equipeLogoUrl as string) || (equipe?.logoUrl as string)}
                                  alt={a.equipeName || equipe?.name || "Equipe"}
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              ) : null}
                              <span>{a.joueurName}</span>
                              {a.equipeId && <span className="text-slate-400 text-[11px]">({a.equipeId})</span>}
                            </span>
                          </td>
                          <td className="py-1 text-right text-slate-100">
                            <span className={rank <= 3 ? "text-emerald-200 font-semibold" : ""}>{renderMetrics(a)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
