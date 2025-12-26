import React from "react";
import { useTeams } from "../hooks/useTeams";

export default function TeamsPage() {
  const { data: teams, isLoading, isError } = useTeams();

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="text-lg font-semibold mb-3">Toutes les Ã©quipes</h2>
      {isLoading && <p className="text-slate-300 text-sm">Chargement...</p>}
      {isError && <p className="text-red-300 text-sm">Erreur lors du chargement des Ã©quipes.</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {teams?.map((team) => (
          <a
            href={`/teams/${encodeURIComponent(team.id)}`}
            key={team.id}
            className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 flex flex-col items-center gap-2 hover:border-slate-700 transition-colors"
          >
            <Logo name={team.name} url={team.logoUrl} size={64} />
            <span className="text-center text-sm font-semibold text-slate-100">{team.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function Logo({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="rounded-full object-cover bg-slate-800"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-slate-800 text-slate-200 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

