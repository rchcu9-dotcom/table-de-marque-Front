import React from "react";
import { useNavigate } from "react-router-dom";
import { useChallengeAll } from "../hooks/useChallengeAll";
import { useTeams } from "../hooks/useTeams";
import { useSelectedTeam } from "../providers/SelectedTeamProvider";
import challengeIcon from "../assets/icons/nav/challenge.png";

export default function ChallengeFinaleAtelierGardienPage() {
  const navigate = useNavigate();
  const { selectedTeam } = useSelectedTeam();
  const { data, isLoading, isError } = useChallengeAll();
  const { data: teams } = useTeams();
  const [search, setSearch] = React.useState("");

  const teamMap = React.useMemo(() => {
    const map = new Map<string, { name: string; logoUrl?: string | null }>();
    teams?.forEach((t) => map.set(t.id.toLowerCase(), { name: t.name, logoUrl: t.logoUrl }));
    return map;
  }, [teams]);

  const sorted = React.useMemo(() => {
    const attempts = (data?.jour1 ?? []).filter(
      (a) => a.metrics.type === "gardien_arret" && a.metrics.tempsTotal > 0,
    );

    let filtered = selectedTeam?.id
      ? attempts.filter((a) => (a.equipeId ?? "").toLowerCase() === selectedTeam.id.toLowerCase())
      : attempts;

    const term = search.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((a) => {
        const joueur = (a.joueurName ?? "").toLowerCase();
        const equipe = (a.equipeName ?? "").toLowerCase();
        return joueur.includes(term) || equipe.includes(term) || (a.equipeId ?? "").toLowerCase().includes(term);
      });
    }

    return [...filtered].sort((a, b) => {
      const ta = a.metrics.type === "gardien_arret" ? a.metrics.tempsTotal : Number.MAX_SAFE_INTEGER;
      const tb = b.metrics.type === "gardien_arret" ? b.metrics.tempsTotal : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });
  }, [data, selectedTeam, search]);

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
              <img src={challengeIcon} alt="Challenge" className="h-full w-full object-cover scale-150" loading="lazy" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Finale Atelier Gardien</h1>
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
          {!isLoading && !isError && (
            sorted.length === 0 ? (
              <p className="text-slate-300 text-sm">Aucune donnée disponible.</p>
            ) : (
              <table className="min-w-full text-xs text-slate-100">
                <thead className="text-[11px] uppercase text-slate-400">
                  <tr>
                    <th className="py-1 pr-3 text-left w-10">Rang</th>
                    <th className="py-1 pr-3 text-left">Joueur</th>
                    <th className="py-1 text-right">Buts</th>
                    <th className="py-1 text-right pl-3">Temps total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-[12px]">
                  {sorted.map((a, idx) => {
                    const eqKey = (a.equipeId ?? "").toLowerCase();
                    const equipe = teamMap.get(eqKey);
                    const m = a.metrics.type === "gardien_arret" ? a.metrics : null;
                    const rank = idx + 1;
                    return (
                      <tr key={`${a.atelierId}-${a.joueurId}-${idx}`}>
                        <td className="py-1 pr-3 text-slate-200 text-center">{rank}</td>
                        <td className={`py-1 pr-3 font-semibold ${rank <= 3 ? "text-emerald-200" : "text-slate-100"}`}>
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
                        <td className="py-1 text-right text-slate-100">{m ? m.nbButs : "-"}</td>
                        <td className={`py-1 text-right pl-3 ${rank <= 3 ? "text-emerald-200 font-semibold" : "text-slate-100"}`}>
                          {m && m.tempsTotal > 0 ? `${(m.tempsTotal / 1000).toFixed(2)} s` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
}
