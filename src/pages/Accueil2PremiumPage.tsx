import React from "react";

type PremiumCard = {
  id: string;
  teamA: string;
  teamB: string;
  leftLogo: string;
  rightLogo: string;
  scoreOrTime: string;
  status: "finished" | "ongoing" | "planned";
};

type TeamCard = {
  id: string;
  name: string;
  shortName: string;
  detail: string;
};

const cards5v5: PremiumCard[] = [
  {
    id: "p-5v5-prev",
    teamA: "Rennes",
    teamB: "Dammarie",
    leftLogo: "RC",
    rightLogo: "DB",
    scoreOrTime: "3 - 1",
    status: "finished",
  },
  {
    id: "p-5v5-live",
    teamA: "Rennes",
    teamB: "Le Havre",
    leftLogo: "RC",
    rightLogo: "LH",
    scoreOrTime: "2 - 2",
    status: "ongoing",
  },
  {
    id: "p-5v5-next",
    teamA: "Meyrin",
    teamB: "Cholet",
    leftLogo: "MY",
    rightLogo: "CH",
    scoreOrTime: "18:20",
    status: "planned",
  },
];

const cardsSmallIce: PremiumCard[] = [
  {
    id: "p-sg-prev",
    teamA: "Neuilly",
    teamB: "Challenge",
    leftLogo: "N",
    rightLogo: "C",
    scoreOrTime: "Termine",
    status: "finished",
  },
  {
    id: "p-sg-live",
    teamA: "Rennes",
    teamB: "Challenge",
    leftLogo: "RC",
    rightLogo: "C",
    scoreOrTime: "En cours",
    status: "ongoing",
  },
  {
    id: "p-sg-next",
    teamA: "Meudon",
    teamB: "Challenge",
    leftLogo: "MD",
    rightLogo: "C",
    scoreOrTime: "18:55",
    status: "planned",
  },
];

const teams: TeamCard[] = [
  { id: "t1", name: "Rennes Cormorans", shortName: "RC", detail: "Equipe suivie prioritaire" },
  { id: "t2", name: "Le Havre Wildocks", shortName: "LH", detail: "Serie de 3 matchs solides" },
  { id: "t3", name: "Meyrin HC", shortName: "MY", detail: "Bloc defensif discipline" },
  { id: "t4", name: "Dammarie Bears", shortName: "DB", detail: "Bon rendement collectif" },
  { id: "t5", name: "Cholet Storm", shortName: "CH", detail: "Transition rapide" },
  { id: "t6", name: "Neuilly Lions", shortName: "NL", detail: "Pressing intense" },
];

function Logo({ value }: { value: string }) {
  return (
    <span
      aria-label={`Logo ${value}`}
      className="inline-grid h-8 w-8 place-items-center rounded-full border border-amber-200/30 bg-slate-950 text-[10px] font-semibold tracking-wide text-amber-50"
    >
      {value}
    </span>
  );
}

function statusLabel(status: PremiumCard["status"]) {
  if (status === "ongoing") return "En cours";
  if (status === "finished") return "Termine";
  return "A venir";
}

function statusTone(status: PremiumCard["status"]) {
  if (status === "ongoing") return "text-amber-200";
  if (status === "finished") return "text-emerald-300";
  return "text-slate-300";
}

function MomentumRow({ title, cards }: { title: string; cards: PremiumCard[] }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">{title}</h3>
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.id}
            data-testid={`accueil2-premium-card-${card.id}`}
            className={`rounded-xl border bg-slate-900/85 p-3 shadow-[0_10px_24px_-18px_rgba(2,6,23,0.95)] transition-colors ${
              card.status === "ongoing"
                ? "border-amber-300/70"
                : "border-slate-700"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span
                className={`text-[11px] uppercase tracking-[0.12em] ${statusTone(card.status)}`}
              >
                {statusLabel(card.status)}
              </span>
              <span className="font-serif text-base font-semibold text-slate-100">{card.scoreOrTime}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Logo value={card.leftLogo} />
                <span className="truncate text-sm text-slate-100">{card.teamA}</span>
              </div>
              <span className="text-xs text-slate-500">vs</span>
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm text-slate-100">{card.teamB}</span>
                <Logo value={card.rightLogo} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Accueil2PremiumPage() {
  return (
    <div
      className="min-h-screen px-4 py-5 text-slate-100 md:px-6 md:py-7"
      style={{
        fontFamily: '"Cormorant Garamond","Lora","Segoe UI",sans-serif',
        background:
          "radial-gradient(1100px 480px at 0% -10%, rgba(250,204,21,0.09), transparent 58%), radial-gradient(900px 500px at 100% 0%, rgba(148,163,184,0.11), transparent 62%), linear-gradient(180deg, #0a1020 0%, #0b1220 45%, #090f1a 100%)",
      }}
    >
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-2xl border border-amber-100/20 bg-slate-950/70 p-6 shadow-[0_18px_60px_-35px_rgba(250,204,21,0.25)] backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.16em] text-amber-100/80">Club officiel</span>
            <span className="rounded-full border border-slate-500 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-200">
              En cours
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[0.02em] text-amber-50 md:text-4xl">
            Tournoi RCHC U11 2026
          </h1>
          <p className="mt-2 text-base text-slate-300">
            Bienvenue dans l&apos;espace officiel du tournoi
          </p>
          <button
            type="button"
            className="mt-5 rounded-lg border border-amber-200/50 bg-amber-100/10 px-4 py-2 text-sm font-semibold tracking-[0.04em] text-amber-100 transition-colors hover:bg-amber-100/20"
          >
            Suivre les matchs
          </button>
        </header>

        <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-950/65 p-4 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-slate-100">Moment du tournoi</h2>
          <MomentumRow title="5v5" cards={cards5v5} />
          <MomentumRow title="Petite glace" cards={cardsSmallIce} />
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-950/65 p-4 backdrop-blur-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-100">Aujourd&apos;hui</h2>
          <div className="grid gap-3 lg:grid-cols-3">
            <article className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Equipe suivie</p>
              <div className="mt-2 flex items-center gap-2">
                <Logo value="RC" />
                <span className="text-sm text-slate-100">Rennes Cormorans</span>
              </div>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Dossier matchs</p>
              <p className="mt-2 text-sm text-slate-100">Prochain: Rennes vs Cholet - 18:20</p>
              <p className="mt-1 text-sm text-emerald-300">Dernier: Rennes 3 - 1 Dammarie</p>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Dossier logistique</p>
              <p className="mt-2 text-sm text-slate-100">Challenge: Atelier Vitesse - 17:45</p>
              <p className="mt-1 text-sm text-slate-300">Repas: 12:30 - Zone Nord</p>
              <p className="mt-1 text-sm text-slate-300">Vestiaire: C - Couloir Est</p>
            </article>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-950/65 p-4 backdrop-blur-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-100">Equipes</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <article
                key={team.id}
                className="rounded-xl border border-slate-700 bg-slate-900/80 p-3 transition-colors hover:border-amber-200/40 active:bg-slate-900"
              >
                <div className="flex items-center gap-2">
                  <Logo value={team.shortName} />
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{team.name}</p>
                    <p className="text-xs text-slate-400">{team.detail}</p>
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
