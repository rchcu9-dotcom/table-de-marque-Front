import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import HexBadge from "../components/ds/HexBadge";
import Card from "../components/ds/Card";
import Spinner from "../components/ds/Spinner";
import { useMatches } from "../hooks/useMatches";
import { useTeams } from "../hooks/useTeams";
import type { Match } from "../api/match";
import { fetchClassementByPoule, type ClassementEntry } from "../api/classement";
import { usePlayersByEquipe } from "../hooks/usePlayers";

type RankedPlayer = {
  name: string;
  numero?: number | null;
  poste?: string | null;
  resultLabel: string;
  icon?: string;
};

const ICONS = {
  vitesse: "https://drive.google.com/thumbnail?id=1rg6fHxVUWLBB5N5B27lTDW8gp0Pl9bxj&sz=w64",
  tir: "https://drive.google.com/thumbnail?id=1Q5PEpy7rvatLWo9thWj9TFuyjJqEFqRx&sz=w64",
  glisse: "https://drive.google.com/thumbnail?id=188Qsqx1zJv0WdYqJzrVCCIN-ufK6MkQe&sz=w64",
  classe: "https://drive.google.com/thumbnail?id=1S3WIVUjU9DA0-4eHOg2tEIjBtAmcK9Dr&sz=w64",
};

function displayName(p: { prenom?: string; nom?: string; name?: string; id?: string }) {
  return `${p.prenom ?? ""} ${p.nom ?? ""}`.trim() || p.name || p.id || "Joueur";
}

function normalizeTeamName(team?: string) {
  return (team ?? "").trim().toLowerCase();
}

function formatDay(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
}

function focusClass(name: string, focusTeam: string) {
  return normalizeTeamName(name) === normalizeTeamName(focusTeam) ? "font-semibold text-slate-50" : "text-slate-400";
}

function computeForm(matches: Match[], team: string) {
  const finished = matches.filter((m) => m.status === "finished" && m.scoreA !== null && m.scoreB !== null);
  const ordered = [...finished].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let wins = 0;
  let losses = 0;
  let draws = 0;
  ordered.forEach((m) => {
    const isTeamA = normalizeTeamName(m.teamA) === normalizeTeamName(team);
    const scoreFor = isTeamA ? m.scoreA! : m.scoreB!;
    const scoreAgainst = isTeamA ? m.scoreB! : m.scoreA!;
    if (scoreFor > scoreAgainst) wins += 1;
    else if (scoreFor < scoreAgainst) losses += 1;
    else draws += 1;
  });
  return { wins, losses, draws };
}

function groupByDay(matches: Match[]) {
  return matches.reduce<Record<string, Match[]>>((acc, m) => {
    const day = new Date(m.date).toISOString().split("T")[0];
    acc[day] = acc[day] ? [...acc[day], m] : [m];
    return acc;
  }, {});
}

function pickTeamLogo(matches: Match[], focusTeam: string, fallback?: string | null) {
  const needle = normalizeTeamName(focusTeam);
  for (const m of matches) {
    if (normalizeTeamName(m.teamA) === needle && m.teamALogo) return m.teamALogo;
    if (normalizeTeamName(m.teamB) === needle && m.teamBLogo) return m.teamBLogo;
  }
  return fallback ?? undefined;
}

export default function TeamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const teamName = decodeURIComponent(id ?? "").trim();
  const { data: matches, isLoading, isError } = useMatches();
  const { data: allTeams } = useTeams();

  const filtered = React.useMemo(() => {
    if (!matches) return [];
    const needle = normalizeTeamName(teamName);
    return matches.filter((m) => normalizeTeamName(m.teamA) === needle || normalizeTeamName(m.teamB) === needle);
  }, [matches, teamName]);

  const sample = filtered[0];
  const pouleCode = sample?.pouleCode ?? sample?.pouleName;

  const classement = useQuery({
    queryKey: ["classement", pouleCode],
    queryFn: () => fetchClassementByPoule(pouleCode!),
    enabled: !!pouleCode,
    staleTime: 5 * 60_000,
  });

  const heroLogo = React.useMemo(
    () => pickTeamLogo(filtered, teamName, sample?.teamALogo ?? sample?.teamBLogo),
    [filtered, sample, teamName],
  );

  const form = computeForm(filtered, teamName);

  const equipeKey = React.useMemo(() => {
    const needle = normalizeTeamName(teamName);
    const found = allTeams?.find(
      (t) => normalizeTeamName(t.name) === needle || normalizeTeamName(t.id) === needle,
    );
    return found?.id ?? teamName;
  }, [allTeams, teamName]);
  const players = usePlayersByEquipe(equipeKey || undefined);

  const grouped = React.useMemo(() => {
    const groups = groupByDay(filtered);
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  if (!teamName) {
    return (
      <div className="p-6 text-slate-100">
        <p>Equipe introuvable.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Spinner />
      </div>
    );
  }

  if (isError || filtered.length === 0) {
    return (
      <div className="p-6 text-slate-100 space-y-4">
        <p>Impossible de charger les donnÃ©es pour {teamName}.</p>
        <button
          className="text-sky-400 underline"
          onClick={() => navigate(-1)}
          type="button"
        >
          Retour
        </button>
      </div>
    );
  }

  const rankingByPoule = classement.data?.equipes ?? [];
  const logoFor = (name: string) => allTeams?.find((t) => normalizeTeamName(t.name) === normalizeTeamName(name))?.logoUrl;

  const dayKeys = grouped.map(([day]) => day);
  const jour1 = dayKeys[0];
  const jour2 = dayKeys[1];
  const jour3 = dayKeys[2];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(236,72,153,0.14),transparent_45%)]" />
        <div className="relative px-6 pb-8 pt-6 md:px-10 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <HexBadge name={teamName} size={68} imageUrl={heroLogo} />
              <div>
                <p className="text-sm uppercase tracking-[0.08em] text-slate-400">Equipe</p>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-50">
                  <span className="font-extrabold text-slate-50">{teamName}</span>
                </h1>
                <p className="text-slate-400 text-sm">{sample?.pouleName ?? sample?.pouleCode ?? "Poule inconnue"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-white/5 border-slate-800 backdrop-blur">
              <p className="text-xs text-slate-400">Forme (tous terminÃ©s)</p>
              <p className="text-lg font-semibold text-slate-50">
                {form.wins}G / {form.draws}N / {form.losses}P
              </p>
              <p className="text-xs text-slate-500">BasÃ©e sur tous les matchs terminÃ©s</p>
            </Card>
            <Card className="bg-white/5 border-slate-800 backdrop-blur">
              <p className="text-xs text-slate-400">Prochains matchs</p>
              <div className="flex flex-col gap-2 mt-2">
                {getUpcoming(filtered).length > 0 ? (
                  getUpcoming(filtered).map((m) => (
                    <InlineMatchCard
                      key={m.id}
                      match={m}
                      focusTeam={teamName}
                      onSelect={(id) => navigate(`/matches/${id}`)}
                    />
                  ))
                ) : (
                  <span className="text-slate-500 text-sm">Aucun match a venir</span>
                )}
              </div>
            </Card>
            <Card className="bg-white/5 border-slate-800 backdrop-blur">
              <p className="text-xs text-slate-400">Derniers matchs</p>
              <div className="flex flex-col gap-2 mt-2">
                {getRecent(filtered).length > 0 ? (
                  getRecent(filtered).map((m) => (
                    <InlineMatchCard
                      key={m.id}
                      match={m}
                      focusTeam={teamName}
                      onSelect={(id) => navigate(`/matches/${id}`)}
                    />
                  ))
                ) : (
                  <span className="text-slate-500 text-sm">Pas de match jouÃ©</span>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10 pb-12 space-y-10 max-w-6xl mx-auto">
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-50">Effectif</h3>
          <PlayersGrid players={players.data} loading={players.isLoading} />
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-50">Classements & highlights par jour</h3>

          {jour1 && (
            <Card className="bg-white/5 border-slate-800 backdrop-blur space-y-3">
              <div className="flex items-center gap-3">
                <HexBadge name="Jour 1" size={36} imageUrl={ICONS.classe} />
                <div className="text-sm font-semibold text-slate-100">Jour 1 - {formatDay(jour1)}</div>
              </div>
              <DayClassement
                title="Classement 5v5"
                icon={ICONS.classe}
                classement={rankingByPoule}
                focusTeam={teamName}
                logoFor={logoFor}
                navigate={navigate}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <HighlightBlock
                  title="Vitesse (2 meilleurs)"
                  icon={ICONS.vitesse}
                  players={players.data?.slice(0, 2).map((p, idx) => ({
                    name: displayName(p),
                    numero: p.numero,
                    poste: p.poste,
                    resultLabel: `${27 + idx * 0.4}s`,
                    icon: heroLogo,
                  })) ?? []}
                />
                <HighlightBlock
                  title="Adresse au tir (2 meilleurs)"
                  icon={ICONS.tir}
                  players={players.data?.slice(0, 2).map((p, idx) => ({
                    name: displayName(p),
                    numero: p.numero,
                    poste: p.poste,
                    resultLabel: `${20 - idx * 3} pts`,
                    icon: heroLogo,
                  })) ?? []}
                />
                <HighlightBlock
                  title="Glisse & agilité (2 meilleurs)"
                  icon={ICONS.glisse}
                  players={players.data?.slice(0, 2).map((p, idx) => ({
                    name: displayName(p),
                    numero: p.numero,
                    poste: p.poste,
                    resultLabel: `${30 + idx * 0.8}s`,
                    icon: heroLogo,
                  })) ?? []}
                />
              </div>
            </Card>
          )}

          {jour2 && (
            <Card className="bg-white/5 border-slate-800 backdrop-blur space-y-3">
              <div className="flex items-center gap-3">
                <HexBadge name="Jour 2" size={36} imageUrl={ICONS.classe} />
                <div className="text-sm font-semibold text-slate-100">Jour 2 · {formatDay(jour2)}</div>
              </div>
              <DayClassement
                title="Classement 5v5"
                icon={ICONS.classe}
                classement={rankingByPoule}
                focusTeam={teamName}
                logoFor={logoFor}
                navigate={navigate}
              />
            </Card>
          )}

          {jour3 && (
            <Card className="bg-white/5 border-slate-800 backdrop-blur space-y-3">
              <div className="flex items-center gap-3">
                <HexBadge name="Jour 3" size={36} imageUrl={ICONS.classe} />
                <div className="text-sm font-semibold text-slate-100">Jour 3 · {formatDay(jour3)}</div>
              </div>
              <DayClassement
                title="Classement CarrÃ©"
                icon={ICONS.classe}
                classement={rankingByPoule}
                focusTeam={teamName}
                logoFor={logoFor}
                navigate={navigate}
              />
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function InlineMatchCard({
  match,
  focusTeam,
  onSelect,
}: {
  match: Match;
  focusTeam: string;
  onSelect: (id: string) => void;
}) {
  const d = new Date(match.date);
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const isScored =
    (match.status === "finished" || match.status === "ongoing") &&
    match.scoreA !== null &&
    match.scoreB !== null;

  const winnerClass = (side: "A" | "B") => {
    if (match.status !== "finished" || match.scoreA === null || match.scoreB === null) return "text-slate-200";
    if (match.scoreA === match.scoreB) return "text-slate-200";
    const win = side === "A" ? match.scoreA > match.scoreB : match.scoreB > match.scoreA;
    return win ? "text-emerald-300" : "text-slate-300";
  };

  const focusHighlight = (team: string) => (normalizeTeamName(team) === normalizeTeamName(focusTeam) ? "font-semibold" : "");

  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-slate-900/80 px-3 py-1 shadow-inner shadow-slate-950 cursor-pointer transition ${
        match.status === "ongoing" ? "border-amber-400 live-pulse-card ring-2 ring-amber-300/60" : "border-slate-800"
      }`}
      onClick={() => onSelect(match.id)}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg opacity-25">
        <div
          className="absolute inset-y-0 left-0 w-1/3"
          style={{
            backgroundImage: match.teamALogo ? `url(${match.teamALogo})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage: "linear-gradient(90deg, rgba(0,0,0,0.75), rgba(0,0,0,0))",
            WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0.75), rgba(0,0,0,0))",
            transform: "skewX(-10deg)",
            transformOrigin: "left",
          }}
        />
        <div className="absolute inset-y-0 left-1/3 right-1/3" />
        <div
          className="absolute inset-y-0 right-0 w-1/3"
          style={{
            backgroundImage: match.teamBLogo ? `url(${match.teamBLogo})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage: "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.75))",
            WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.75))",
            transform: "skewX(-10deg)",
            transformOrigin: "right",
          }}
        />
      </div>

      <div className="relative flex items-center gap-2">
        <div className="flex items-center gap-1 min-w-0 justify-start flex-1">
          {match.teamALogo && <img src={match.teamALogo} alt={match.teamA} className="h-5 w-5 rounded-full object-cover" />}
          <span
            className={`text-[12px] leading-tight font-normal truncate block whitespace-nowrap ${winnerClass("A")} ${focusHighlight(match.teamA)}`}
          >
            {match.teamA}
          </span>
        </div>
        <div className="flex-none w-20 text-center">
          {isScored ? (
            <span className="text-[12px] leading-tight font-semibold text-slate-100 whitespace-nowrap">
              <span className={winnerClass("A")}>{match.scoreA}</span>
              <span className="mx-1 text-slate-400">-</span>
              <span className={winnerClass("B")}>{match.scoreB}</span>
            </span>
          ) : (
            <span className="text-[12px] leading-tight font-semibold text-slate-100 whitespace-nowrap">{time}</span>
          )}
        </div>
        <div className="flex items-center gap-1 justify-end min-w-0 flex-1">
          <span
            className={`text-[12px] leading-tight font-normal truncate text-right block whitespace-nowrap ${winnerClass("B")} ${focusHighlight(match.teamB)}`}
          >
            {match.teamB}
          </span>
          {match.teamBLogo && <img src={match.teamBLogo} alt={match.teamB} className="h-5 w-5 rounded-full object-cover" />}
        </div>
      </div>
    </div>
  );
}

function PlayersGrid({ players, loading }: { players?: Array<{ id?: string; name?: string; prenom?: string; nom?: string; poste?: string; numero?: number | null }>; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }
  if (!players || players.length === 0) {
    return <p className="text-slate-400 text-sm">Aucun joueur disponible.</p>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {players.map((p) => (
        <Card key={p.id ?? p.name} className="bg-white/5 border-slate-800 backdrop-blur flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-slate-800 text-slate-100 flex items-center justify-center text-sm font-semibold">
            {p.numero ?? "?"}
          </div>
          <div className="flex flex-col">
            <span className="text-slate-100 font-semibold text-sm">{displayName(p)}</span>
            <span className="text-xs text-slate-400">{p.poste ?? "N/A"}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function getUpcoming(matches: Match[]) {
  return [...matches]
    .filter((m) => m.status === "planned")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);
}

function getRecent(matches: Match[]) {
  return [...matches]
    .filter((m) => m.status === "ongoing" || m.status === "finished")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
}

function DayClassement({
  title,
  icon,
  classement,
  focusTeam,
  logoFor,
  navigate,
}: {
  title: string;
  icon?: string;
  classement: ClassementEntry[];
  focusTeam: string;
  logoFor: (name: string) => string | undefined | null;
  navigate: (path: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon && <span className="h-6 w-6 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${icon})` }} />}
        <p className="text-sm font-semibold text-slate-100">{title}</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {classement.map((entry) => (
          <button
            key={entry.name}
            type="button"
            onClick={() => navigate(`/teams/${encodeURIComponent(entry.name)}`)}
            className={`w-full rounded-lg border px-3 py-2 flex items-center gap-2 text-left ${normalizeTeamName(entry.name) === normalizeTeamName(focusTeam) ? "border-emerald-400/70 bg-emerald-500/10" : "border-slate-800 bg-slate-900/70"}`}
          >
            <HexBadge name={entry.name} size={28} imageUrl={logoFor(entry.name) ?? undefined} />
            <div className="flex-1 flex items-center justify-between gap-2">
              <span className={`${focusClass(entry.name, focusTeam)} text-sm truncate`}>{entry.name}</span>
              <span className="text-xs text-slate-400">Rang {entry.rang ?? "-"}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function HighlightBlock({ title, icon, players }: { title: string; icon?: string; players: RankedPlayer[] }) {
  if (!players || players.length === 0) return null;
  return (
    <Card className="bg-white/5 border-slate-800 backdrop-blur space-y-2">
      <div className="flex items-center gap-2">
        {icon && <span className="h-6 w-6 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${icon})` }} />}
        <p className="text-sm font-semibold text-slate-100">{title}</p>
      </div>
      <div className="space-y-2">
        {players.map((p) => (
          <div key={p.name} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-800 text-slate-100 flex items-center justify-center text-xs font-semibold">
              {p.numero ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{p.name}</p>
              <p className="text-xs text-slate-400">{p.poste ?? ""}</p>
            </div>
            <div className="text-sm font-semibold text-emerald-200">{p.resultLabel}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}











