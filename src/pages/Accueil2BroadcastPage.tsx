import React from "react";

type BroadcastCard = {
  id: string;
  teamA: string;
  teamB: string;
  leftLogo: string;
  rightLogo: string;
  scoreOrTime: string;
  status: "finished" | "ongoing" | "planned";
};

type TeamTile = {
  id: string;
  name: string;
  shortName: string;
  note: string;
};

const cards5v5: BroadcastCard[] = [
  {
    id: "b-5v5-prev",
    teamA: "Rennes",
    teamB: "Dammarie",
    leftLogo: "RC",
    rightLogo: "DB",
    scoreOrTime: "3 - 1",
    status: "finished",
  },
  {
    id: "b-5v5-live",
    teamA: "Rennes",
    teamB: "Le Havre",
    leftLogo: "RC",
    rightLogo: "LH",
    scoreOrTime: "2 - 2",
    status: "ongoing",
  },
  {
    id: "b-5v5-next",
    teamA: "Meyrin",
    teamB: "Cholet",
    leftLogo: "MY",
    rightLogo: "CH",
    scoreOrTime: "18:20",
    status: "planned",
  },
];

const cardsSmallGlace: BroadcastCard[] = [
  {
    id: "b-sg-prev",
    teamA: "Neuilly",
    teamB: "Challenge",
    leftLogo: "N",
    rightLogo: "C",
    scoreOrTime: "Termine",
    status: "finished",
  },
  {
    id: "b-sg-live",
    teamA: "Rennes",
    teamB: "Challenge",
    leftLogo: "RC",
    rightLogo: "C",
    scoreOrTime: "En cours",
    status: "ongoing",
  },
  {
    id: "b-sg-next",
    teamA: "Meudon",
    teamB: "Challenge",
    leftLogo: "MD",
    rightLogo: "C",
    scoreOrTime: "18:55",
    status: "planned",
  },
];

const teams: TeamTile[] = [
  { id: "t1", name: "Rennes Cormorans", shortName: "RC", note: "forme solide" },
  { id: "t2", name: "Le Havre Wildocks", shortName: "LH", note: "bonne dynamique" },
  { id: "t3", name: "Meyrin HC", shortName: "MY", note: "bloc defensif fort" },
  { id: "t4", name: "Dammarie Bears", shortName: "DB", note: "jeu rapide" },
  { id: "t5", name: "Cholet Storm", shortName: "CH", note: "pression haute" },
  { id: "t6", name: "Neuilly Lions", shortName: "NL", note: "impact physique" },
];

function Logo({ value }: { value: string }) {
  return (
    <span
      aria-label={`Logo ${value}`}
      className="inline-grid h-8 w-8 place-items-center rounded-full border border-slate-500 bg-slate-950 text-[10px] font-bold tracking-wide text-slate-100"
    >
      {value}
    </span>
  );
}

function statusChip(status: BroadcastCard["status"]) {
  if (status === "ongoing") {
    return (
      <span className="rounded bg-amber-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200">
        direct
      </span>
    );
  }
  if (status === "finished") {
    return (
      <span className="rounded bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">
        termine
      </span>
    );
  }
  return (
    <span className="rounded bg-slate-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">
      a venir
    </span>
  );
}

function BroadcastRow({ title, cards }: { title: string; cards: BroadcastCard[] }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-200">{title}</h3>
        <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">fil en direct</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.id}
            data-testid={`accueil2-broadcast-card-${card.id}`}
            className={`rounded-lg border bg-slate-950/85 p-3 shadow-[0_18px_34px_-24px_rgba(2,6,23,0.9)] ${
              card.status === "ongoing"
                ? "border-amber-400/90"
                : "border-slate-700"
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              {statusChip(card.status)}
              <span className="font-mono text-lg font-bold text-slate-100">{card.scoreOrTime}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Logo value={card.leftLogo} />
                <span className="truncate text-sm font-semibold text-slate-100">{card.teamA}</span>
              </div>
              <span className="text-xs text-slate-500">vs</span>
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-slate-100">{card.teamB}</span>
                <Logo value={card.rightLogo} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Accueil2BroadcastPage() {
  return (
    <div
      className="min-h-screen px-4 py-5 text-slate-100 md:px-6 md:py-7"
      style={{
        fontFamily: '"Rajdhani","Oswald","Segoe UI",sans-serif',
        background:
          "radial-gradient(1000px 420px at 0% -5%, rgba(239,68,68,0.16), transparent 62%), radial-gradient(900px 460px at 100% 0%, rgba(245,158,11,0.14), transparent 58%), linear-gradient(180deg, #04060d 0%, #0b1220 50%, #0a0f1a 100%)",
      }}
    >
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-lg border border-slate-700 bg-slate-950/85">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-200">
              RCHC U11 2026 • Edition speciale
            </span>
            <span className="rounded bg-red-500/20 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-red-200">
              direct
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
            <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">breaking</span>
            Rennes et Le Havre a egalite, action decisive en cours
          </div>
        </section>

        <section className="rounded-lg border border-slate-700 bg-slate-950/85 p-5">
          <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-amber-200">cartouche principal</p>
          <h1 className="text-3xl font-bold uppercase tracking-[0.04em] text-slate-50 md:text-4xl">
            Ca joue !
          </h1>
          <p className="mt-2 text-base text-slate-300">Rennes vs Le Havre • Match en cours</p>
          <button
            type="button"
            className="mt-4 rounded-md border border-amber-400/80 bg-amber-500/15 px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-amber-100 transition-colors hover:bg-amber-500/25"
          >
            Voir le match en cours
          </button>
        </section>

        <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-950/85 p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-lg font-bold uppercase tracking-[0.1em] text-slate-100">Fil en direct</h2>
            <span className="text-xs uppercase tracking-[0.14em] text-slate-400">edition tv</span>
          </div>
          <BroadcastRow title="5v5" cards={cards5v5} />
          <BroadcastRow title="Petite glace" cards={cardsSmallGlace} />
        </section>

        <section className="rounded-lg border border-slate-700 bg-slate-950/85 p-4">
          <h2 className="mb-3 text-lg font-bold uppercase tracking-[0.1em] text-slate-100">Aujourd&apos;hui</h2>
          <div className="grid gap-3 lg:grid-cols-3">
            <article className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Equipe suivie</p>
              <div className="mt-2 flex items-center gap-2">
                <Logo value="RC" />
                <p className="text-sm font-semibold text-slate-100">Rennes Cormorans</p>
              </div>
            </article>
            <article className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Prochain / Dernier</p>
              <p className="mt-2 text-sm text-slate-100">Prochain: Rennes vs Cholet - 18:20</p>
              <p className="mt-1 text-sm text-emerald-300">Dernier: Rennes 3 - 1 Dammarie</p>
            </article>
            <article className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Edition locale</p>
              <p className="mt-2 text-sm text-slate-100">Challenge: Atelier Vitesse - 17:45</p>
              <p className="mt-1 text-sm text-slate-300">Repas: 12:30 - Zone Nord</p>
            </article>
          </div>
        </section>

        <section className="rounded-lg border border-slate-700 bg-slate-950/85 p-4">
          <h2 className="mb-3 text-lg font-bold uppercase tracking-[0.1em] text-slate-100">Equipes</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <article key={team.id} className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
                <div className="flex items-center gap-2">
                  <Logo value={team.shortName} />
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{team.name}</p>
                    <p className="text-xs text-slate-400">{team.note}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
