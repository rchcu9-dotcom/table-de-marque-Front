import React from "react";
import { useMomentumMatches } from "../hooks/useMatches";
import type { Match } from "../api/match";
import { useChallengeClassement } from "../hooks/useChallengeClassement";

export default function Challenge3v3Page() {
  const { data: momentumPG } = useMomentumMatches({ surface: "PG", competitionType: "3v3" });
  const { data: challenge, isLoading, isError } = useChallengeClassement();

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-semibold mb-3">En ce moment sur la petite glace</h2>
        <MatchStack matches={momentumPG ?? []} />
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-semibold mb-3">Classement Challenge</h2>
        {isLoading && <p className="text-slate-300 text-sm">Chargement…</p>}
        {isError && <p className="text-red-300 text-sm">Erreur lors du chargement.</p>}
        {!isLoading && !isError && challenge && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-900/80 backdrop-blur text-slate-300">
                <tr className="text-left">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Joueur</th>
                  <th className="py-1 pr-2">Total rang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {challenge.map((entry, idx) => (
                  <tr key={entry.joueurId} className="text-slate-100">
                    <td className="py-1 pr-2">{idx + 1}</td>
                    <td className="py-1 pr-2">{entry.joueurId}</td>
                    <td className="py-1 pr-2">{entry.totalRang}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function MatchStack({ matches }: { matches: Match[] }) {
  if (!matches || matches.length === 0) {
    return <p className="text-slate-300 text-sm">Aucun match à afficher.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {matches.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <Logo name={m.teamA} url={m.teamALogo} />
            <span className="font-semibold">{m.teamA}</span>
            <span className="text-slate-400 text-sm">vs</span>
            <Logo name={m.teamB} url={m.teamBLogo} />
            <span className="font-semibold">{m.teamB}</span>
          </div>
          <div className="text-right text-sm">
            <StatusBadge status={m.status} />
            <div className="text-slate-300 text-xs">
              {m.scoreA !== null && m.scoreB !== null
                ? `${m.scoreA} - ${m.scoreB}`
                : new Date(m.date).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Logo({ name, url, size = 32 }: { name: string; url?: string | null; size?: number }) {
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

function StatusBadge({ status }: { status: Match["status"] }) {
  const map: Record<Match["status"], string> = {
    ongoing: "En cours",
    planned: "À venir",
    finished: "Terminé",
    deleted: "Annulé",
  };
  const color =
    status === "ongoing"
      ? "bg-amber-500/20 text-amber-300 border-amber-400/60"
      : status === "planned"
        ? "bg-slate-700/50 text-slate-100 border-slate-500/60"
        : "bg-emerald-500/20 text-emerald-200 border-emerald-400/60";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${color}`}>
      {map[status]}
    </span>
  );
}
