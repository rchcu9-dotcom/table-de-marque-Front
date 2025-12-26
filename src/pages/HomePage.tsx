import React from "react";
import { useNavigate } from "react-router-dom";
import HorizontalMatchSlider from "../components/collections/HorizontalMatchSlider";
import { useMomentumMatches } from "../hooks/useMatches";
import { useTeams } from "../hooks/useTeams";

export default function HomePage() {
  const navigate = useNavigate();
  const { data: momentum } = useMomentumMatches({ surface: "GG", competitionType: "5v5" });
  const { data: momentumPG } = useMomentumMatches({ surface: "PG", competitionType: "3v3" });
  const { data: momentumChallenge } = useMomentumMatches({ surface: "PG", competitionType: "challenge" });
  const { data: teams } = useTeams();

  const [show5v5, setShow5v5] = React.useState(true);
  const [show3v3, setShow3v3] = React.useState(false);
  const [showChallenge, setShowChallenge] = React.useState(false);

  const momentumTitle = React.useMemo(() => {
    const first = momentum?.[0];
    if (!first) return "Tournoi 5v5";
    const competitionLabel =
      first.competitionType === "3v3" ? "Tournoi 3v3" : first.competitionType === "challenge" ? "Challenge" : "Tournoi 5v5";
    const phaseLabel =
      first.phase ||
      (first.pouleName?.match(/brassage/i)
        ? "Brassage"
        : first.pouleName?.match(/qualification/i)
          ? "Qualification"
          : first.pouleName?.match(/final/i)
            ? "Finales"
            : undefined);
    const pouleLabel = first.pouleName;
    return [competitionLabel, phaseLabel, pouleLabel].filter(Boolean).join(" - ");
  }, [momentum]);

  const momentumPGTitle = React.useMemo(() => {
    const first = momentumPG?.[0];
    if (!first) return "Tournoi 3v3";
    const competitionLabel =
      first.competitionType === "3v3" ? "Tournoi 3v3" : first.competitionType === "challenge" ? "Challenge" : "5v5";
    const pouleLabel = first.pouleName;
    return [competitionLabel, pouleLabel].filter(Boolean).join(" - ");
  }, [momentumPG]);

  const momentumPGChallengeTitle = "Challenge individuel (Phase Evaluation)";

  return (
    <div className="flex flex-col gap-6">
      <section className="sticky top-2 z-10 rounded-xl border border-slate-800 bg-slate-950/80 backdrop-blur px-4 py-3 shadow-lg shadow-slate-900/40">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-white">Accueil</h1>
          <p className="text-sm text-slate-300">Bienvenue sur l’app du tournoi U11 RCHC 2026.</p>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <BadgeToggle label="5v5" active={show5v5} onClick={() => setShow5v5((v) => !v)} />
          <BadgeToggle label="3v3" active={show3v3} onClick={() => setShow3v3((v) => !v)} />
          <BadgeToggle label="Challenge" active={showChallenge} onClick={() => setShowChallenge((v) => !v)} />
        </div>
      </section>

      {show5v5 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-lg font-semibold mb-3">{momentumTitle}</h2>
          <HorizontalMatchSlider
            matches={momentum?.slice(0, 3) ?? []}
            currentMatchId={momentum && momentum[1]?.id}
            onSelect={(id) => navigate(`/matches/${id}`)}
            testIdPrefix="home-momentum"
            withDiagonalBg
          />
        </section>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Équipes</h2>
        </div>
        <TeamGrid teams={(teams ?? []).slice(0, 16)} />
      </section>

      {show3v3 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-lg font-semibold mb-3">{momentumPGTitle}</h2>
          <HorizontalMatchSlider
            matches={momentumPG?.slice(0, 3) ?? []}
            currentMatchId={momentumPG && momentumPG[1]?.id}
            onSelect={(id) => navigate(`/matches/${id}`)}
            testIdPrefix="home-pg"
            withDiagonalBg
          />
        </section>
      )}

      {showChallenge && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-lg font-semibold mb-3">{momentumPGChallengeTitle}</h2>
          {momentumChallenge && momentumChallenge.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {momentumChallenge.slice(0, 4).map((m) => {
                const date = new Date(m.date);
                const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                const badge =
                  m.status === "finished"
                    ? { label: "Terminé", className: "bg-emerald-600/20 text-emerald-300 border-emerald-500/60" }
                    : m.status === "ongoing"
                      ? { label: "En cours", className: "bg-amber-500/20 text-amber-200 border-amber-400/60 animate-pulse" }
                      : { label: time, className: "bg-slate-700/40 text-slate-100 border-slate-500/60" };
                return (
                  <div
                    key={m.id}
                    className="min-w-[160px] flex-shrink-0 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3 flex flex-col items-center gap-2 cursor-pointer hover:-translate-y-0.5 transition"
                    onClick={() => navigate(`/challenge/${encodeURIComponent(m.teamA)}`)}
                  >
                    <Logo name={m.teamA} url={m.teamALogo ?? undefined} size={72} />
                    <div className="text-center text-sm font-semibold text-white">{m.teamA}</div>
                    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-300 text-sm">Aucun créneau challenge.</p>
          )}
        </section>
      )}
    </div>
  );
}

function TeamGrid({ teams }: { teams: { id: string; name: string; logoUrl?: string | null }[] }) {
  if (!teams || teams.length === 0) {
    return <p className="text-slate-300 text-sm">Aucune équipe.</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {teams.map((team) => (
        <a
          href={`/teams/${encodeURIComponent(team.id)}`}
          key={team.id}
          className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900/70 aspect-[8/3] flex items-end p-3 shadow-inner hover:-translate-y-0.5 transition"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: team.logoUrl ? `url(${team.logoUrl})` : undefined,
              opacity: team.logoUrl ? 0.25 : 0,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
          <div className="relative flex items-center gap-2">
            <Logo name={team.name} url={team.logoUrl} size={48} />
            <span className="text-sm font-semibold text-white drop-shadow">{team.id}</span>
          </div>
        </a>
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

function BadgeToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-sm font-semibold transition ${
        active
          ? "bg-emerald-600/20 text-emerald-200 border-emerald-500/60"
          : "bg-slate-800/60 text-slate-200 border-slate-600/60 hover:border-slate-400"
      }`}
    >
      {label}
    </button>
  );
}
