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
import icon5v5 from "../assets/icons/nav/fivev5.png";

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
    const list = Array.isArray(allTeams) ? allTeams : [];
    const needle = normalizeTeamName(teamName);
    const found = list.find(
      (t) => normalizeTeamName(t.name) === needle || normalizeTeamName(t.id) === needle,
    );
    return found?.id ?? teamName;
  }, [allTeams, teamName]);
  const players = usePlayersByEquipe(equipeKey || undefined);
  const playerList = React.useMemo(() => {
    const data = players.data;
    return Array.isArray(data) ? data : [];
  }, [players.data]);

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
        <p>Impossible de charger les données pour {teamName}.</p>
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
  const teamsList = Array.isArray(allTeams) ? allTeams : [];
  const logoFor = (name: string) =>
    teamsList.find((t) => normalizeTeamName(t.name) === normalizeTeamName(name))?.logoUrl;

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
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-white/5 border-slate-800 backdrop-blur">
              <p className="text-xs text-slate-400">Forme</p>
              <p className="text-lg font-semibold text-slate-50">
                {form.wins}G / {form.draws}N / {form.losses}P
              </p>
              <p className="text-xs text-slate-500">Basés sur tous les matchs terminés</p>
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
                  <span className="text-slate-500 text-sm">Aucun match à venir</span>
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
                  <span className="text-slate-500 text-sm">Pas de match joué</span>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10 pb-12 space-y-10 max-w-6xl mx-auto">
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-50">Effectif</h3>
          <PlayersGrid players={playerList} loading={players.isLoading} />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="bg-white/5 border-slate-800 backdrop-blur">
            <h4 className="text-sm font-semibold text-slate-100 mb-2">Repas</h4>
            <ul className="space-y-2 text-sm text-slate-200">
              <li className="flex items-center justify-between"><span>J1</span><span>12:30 - Salle principale</span></li>
              <li className="flex items-center justify-between"><span>J2</span><span>12:30 - Salle principale</span></li>
              <li className="flex items-center justify-between"><span>J3</span><span>12:30 - Salle principale</span></li>
            </ul>
          </Card>
          <Card className="bg-white/5 border-slate-800 backdrop-blur space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Vestiaire</h4>
              <p className="text-sm text-slate-300">Vestiaire A (mock)</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Teaser</h4>
              <p className="text-sm text-slate-300">Equipe réputée pour sa vitesse et sa cohésion sur glace.</p>
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-50">Calendrier</h3>
          <p className="text-sm text-slate-400">Classements & highlights par jour</p>

          {jour1 && (
            <Card className="bg-white/5 border-slate-800 backdrop-blur space-y-3">
              <div className="text-sm font-semibold text-slate-100">Jour 1 - {formatDay(jour1)}</div>
              <DayClassement
                title="Classement 5v5"
                icon={icon5v5}
                classement={rankingByPoule}
                focusTeam={teamName}
                logoFor={logoFor}
                navigate={navigate}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <HighlightBlock
                  title="Vitesse (2 meilleurs)"
                  icon={ICONS.vitesse}
                  players={playerList.slice(0, 2).map((p, idx) => ({
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
                  players={playerList.slice(0, 2).map((p, idx) => ({
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
                  players={playerList.slice(0, 2).map((p, idx) => ({
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
              <div className="text-sm font-semibold text-slate-100">Jour 2 - {formatDay(jour2)}</div>
              <DayClassement
                title="Classement 5v5"
                icon={icon5v5}
                classement={rankingByPoule}
                focusTeam={teamName}
                logoFor={logoFor}
                navigate={navigate}
              />
            </Card>
          )}

          {jour3 && (
            <Card className="bg-white/5 border-slate-800 backdrop-blur space-y-3">
              <div className="text-sm font-semibold text-slate-100">Jour 3 - {formatDay(jour3)}</div>
              <DayClassement
                title="Classement Carré"
                icon={icon5v5}
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
    <Card className="bg-white/5 border-slate-800 backdrop-blur">
      <div className="divide-y divide-slate-800">
        {players.map((p) => (
          <div key={p.id ?? p.name} className="flex items-center gap-3 py-2">
            <div className="h-9 w-9 rounded-full bg-slate-800 text-slate-100 flex items-center justify-center text-sm font-semibold">
              {p.numero ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-slate-100 font-semibold text-sm truncate block">{displayName(p)}</span>
              <span className="text-xs text-slate-400">{p.poste ?? "N/A"}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
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
  if (!classement || classement.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {icon && <img src={icon} alt="" className="h-5 w-5 rounded-full object-cover bg-slate-800" />}
          <p className="text-sm font-semibold text-slate-100">{title}</p>
        </div>
        <p className="text-sm text-slate-400">Classement indisponible.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon && <img src={icon} alt="" className="h-5 w-5 rounded-full object-cover bg-slate-800" />}
        <p className="text-sm font-semibold text-slate-100">{title}</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/70">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">#</th>
              <th className="px-3 py-2 text-left font-semibold">Équipe</th>
              <th className="px-3 py-2 text-right font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {classement.map((entry) => {
              const isFocus = normalizeTeamName(entry.name) === normalizeTeamName(focusTeam);
              return (
                <tr
                  key={entry.name}
                  className={`border-t border-slate-800 hover:bg-slate-800/60 transition ${isFocus ? "bg-emerald-500/10 border-emerald-400/50" : ""}`}
                  onClick={() => navigate(`/teams/${encodeURIComponent(entry.name)}`)}
                  role="button"
                >
                  <td className="px-3 py-2 text-slate-200">{entry.rang ?? "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <HexBadge name={entry.name} size={28} imageUrl={logoFor(entry.name) ?? undefined} />
                      <span className={`${isFocus ? "text-slate-50 font-semibold" : "text-slate-200"} truncate block`}>
                        {entry.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-100">{entry.points ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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













