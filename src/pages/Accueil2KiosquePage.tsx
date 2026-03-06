import React from "react";

type MatchCard = {
  id: string;
  teamA: string;
  teamB: string;
  logoA: string;
  logoB: string;
  value: string;
  status: "ongoing" | "planned" | "finished";
};

type TeamTile = {
  id: string;
  name: string;
  shortName: string;
  note: string;
};

const rail5v5: MatchCard[] = [
  { id: "5-1", teamA: "Rennes", teamB: "Dammarie", logoA: "RC", logoB: "DB", value: "3 - 1", status: "finished" },
  { id: "5-2", teamA: "Rennes", teamB: "Le Havre", logoA: "RC", logoB: "LH", value: "2 - 2", status: "ongoing" },
  { id: "5-3", teamA: "Meyrin", teamB: "Cholet", logoA: "MY", logoB: "CH", value: "18:20", status: "planned" },
  { id: "5-4", teamA: "Neuilly", teamB: "Angers", logoA: "NL", logoB: "AN", value: "18:47", status: "planned" },
  { id: "5-5", teamA: "Meudon", teamB: "Tours", logoA: "MD", logoB: "TR", value: "19:14", status: "planned" },
];

const railSmallIce: MatchCard[] = [
  { id: "s-1", teamA: "Rennes", teamB: "Challenge", logoA: "RC", logoB: "C", value: "En cours", status: "ongoing" },
  { id: "s-2", teamA: "Meudon", teamB: "Challenge", logoA: "MD", logoB: "C", value: "18:55", status: "planned" },
  { id: "s-3", teamA: "Dammarie", teamB: "3v3", logoA: "DB", logoB: "3", value: "19:10", status: "planned" },
  { id: "s-4", teamA: "Neuilly", teamB: "Challenge", logoA: "NL", logoB: "C", value: "Termine", status: "finished" },
];

const teams: TeamTile[] = [
  { id: "t1", name: "Rennes Cormorans", shortName: "RC", note: "Equipe suivie" },
  { id: "t2", name: "Le Havre Wildocks", shortName: "LH", note: "Bloc defensif solide" },
  { id: "t3", name: "Meyrin HC", shortName: "MY", note: "Transitions rapides" },
  { id: "t4", name: "Dammarie Bears", shortName: "DB", note: "Rythme regulier" },
  { id: "t5", name: "Cholet Storm", shortName: "CH", note: "Pression haute" },
  { id: "t6", name: "Neuilly Lions", shortName: "NL", note: "Impact physique" },
];

const tickerItems = [
  "LIVE 5v5: Rennes 2-2 Le Havre",
  "Prochain: Meyrin vs Cholet 18:20",
  "Challenge: Atelier Vitesse en cours",
  "Logistique: Repas 12:30 Zone Nord",
  "Vestiaire: C - Couloir Est",
];

function Logo({ value }: { value: string }) {
  return (
    <span
      aria-label={`Logo ${value}`}
      className="inline-grid h-8 w-8 place-items-center rounded-full border border-cyan-200/30 bg-slate-950 text-[10px] font-semibold tracking-wide text-cyan-100"
    >
      {value}
    </span>
  );
}

function initialFocusIndex(cards: MatchCard[]): number {
  const ongoing = cards.findIndex((m) => m.status === "ongoing");
  if (ongoing >= 0) return ongoing;
  const planned = cards.findIndex((m) => m.status === "planned");
  if (planned >= 0) return planned;
  const lastFinished = [...cards]
    .map((m, i) => ({ i, m }))
    .filter(({ m }) => m.status === "finished")
    .pop();
  return lastFinished?.i ?? 0;
}

function getWindow(cards: MatchCard[], center: number): MatchCard[] {
  if (cards.length <= 3) return cards;
  const idx = [
    (center - 1 + cards.length) % cards.length,
    center % cards.length,
    (center + 1) % cards.length,
  ];
  return idx.map((i) => cards[i]);
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

function Rail({
  title,
  cards,
  index,
  onPrev,
  onNext,
  paused,
  setPaused,
}: {
  title: string;
  cards: MatchCard[];
  index: number;
  onPrev: () => void;
  onNext: () => void;
  paused: boolean;
  setPaused: (paused: boolean) => void;
}) {
  const visible = getWindow(cards, index);
  return (
    <section
      className="space-y-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-100">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="h-8 w-8 rounded border border-slate-600 text-slate-200 transition-colors hover:border-cyan-300/60"
            aria-label={`Voir les cartes precedentes ${title}`}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            className="h-8 w-8 rounded border border-slate-600 text-slate-200 transition-colors hover:border-cyan-300/60"
            aria-label={`Voir les cartes suivantes ${title}`}
          >
            ›
          </button>
          {paused ? (
            <span className="text-[11px] uppercase tracking-[0.12em] text-slate-400">pause</span>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {visible.map((card) => (
          <article
            key={card.id}
            data-testid={`accueil2-kiosque-card-${card.id}`}
            className={`rounded-xl border bg-slate-900/80 p-3 shadow-[0_12px_26px_-18px_rgba(2,6,23,0.95)] ${
              card.status === "ongoing" ? "border-amber-300/90" : "border-slate-700"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span
                className={`text-[11px] uppercase tracking-[0.12em] ${
                  card.status === "ongoing"
                    ? "text-amber-200"
                    : card.status === "finished"
                      ? "text-emerald-300"
                      : "text-slate-300"
                }`}
              >
                {card.status === "ongoing" ? "En cours" : card.status === "finished" ? "Termine" : "A venir"}
              </span>
              <span className="font-mono text-base font-semibold text-slate-100">{card.value}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Logo value={card.logoA} />
                <span className="truncate text-sm text-slate-100">{card.teamA}</span>
              </div>
              <span className="text-xs text-slate-500">vs</span>
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm text-slate-100">{card.teamB}</span>
                <Logo value={card.logoB} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Accueil2KiosquePage() {
  const reducedMotion = useReducedMotion();
  const [heroIn, setHeroIn] = React.useState(false);
  const [storyIn, setStoryIn] = React.useState(false);
  const [tickerPaused, setTickerPaused] = React.useState(false);

  const [idx5v5, setIdx5v5] = React.useState(() => initialFocusIndex(rail5v5));
  const [idxSmall, setIdxSmall] = React.useState(() => initialFocusIndex(railSmallIce));
  const [pause5v5, setPause5v5] = React.useState(false);
  const [pauseSmall, setPauseSmall] = React.useState(false);

  React.useEffect(() => {
    setHeroIn(true);
    const timer = window.setTimeout(() => setStoryIn(true), 200);
    return () => window.clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (reducedMotion || pause5v5) return;
    const timer = window.setInterval(() => {
      setIdx5v5((prev) => (prev + 1) % rail5v5.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [reducedMotion, pause5v5]);

  React.useEffect(() => {
    if (reducedMotion || pauseSmall) return;
    const timer = window.setInterval(() => {
      setIdxSmall((prev) => (prev + 1) % railSmallIce.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [reducedMotion, pauseSmall]);

  return (
    <div
      className="min-h-screen px-4 py-5 text-slate-100 md:px-6 md:py-7"
      style={{
        fontFamily: '"Rajdhani","Orbitron","Oswald","Segoe UI",sans-serif',
        background:
          "radial-gradient(1200px 520px at 0% -12%, rgba(34,211,238,0.16), transparent 60%), radial-gradient(900px 460px at 100% 0%, rgba(245,158,11,0.14), transparent 58%), linear-gradient(180deg, #020617 0%, #0a1120 52%, #060b16 100%)",
      }}
    >
      <style>{`
        .kiosk-hero-enter {
          animation: kioskHeroEnter 1100ms ease-out both;
        }
        .kiosk-story {
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 420ms ease, transform 420ms ease;
        }
        .kiosk-story.in {
          opacity: 1;
          transform: translateY(0);
        }
        .kiosk-ticker-track {
          display: flex;
          width: max-content;
          gap: 2rem;
          animation: kioskTicker 26s linear infinite;
        }
        .kiosk-ticker-track.paused {
          animation-play-state: paused;
        }
        @keyframes kioskHeroEnter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes kioskTicker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>

      <div className="mx-auto max-w-6xl space-y-4">
        <header
          className={`rounded-2xl border border-slate-700 bg-slate-950/70 p-5 shadow-[0_20px_70px_-38px_rgba(34,211,238,0.45)] backdrop-blur-sm ${
            !reducedMotion && heroIn ? "kiosk-hero-enter" : ""
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center rounded-full border border-amber-300/70 bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-200">
              LIVE
            </span>
            <span className="text-xs uppercase tracking-[0.14em] text-cyan-200/80">Kiosque Live</span>
          </div>
          <h1 className="text-3xl font-bold tracking-[0.02em] text-cyan-100 md:text-4xl">Ca joue !</h1>
          <p className="mt-2 text-slate-300">Rennes vs Le Havre • Match en cours</p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-cyan-300/60 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/20"
          >
            Voir le match en cours
          </button>
        </header>

        <section className="space-y-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-slate-100">Momentum</h2>
          <Rail
            title="5v5"
            cards={rail5v5}
            index={idx5v5}
            onPrev={() => setIdx5v5((prev) => (prev - 1 + rail5v5.length) % rail5v5.length)}
            onNext={() => setIdx5v5((prev) => (prev + 1) % rail5v5.length)}
            paused={pause5v5}
            setPaused={setPause5v5}
          />
          <Rail
            title="Petite glace"
            cards={railSmallIce}
            index={idxSmall}
            onPrev={() => setIdxSmall((prev) => (prev - 1 + railSmallIce.length) % railSmallIce.length)}
            onNext={() => setIdxSmall((prev) => (prev + 1) % railSmallIce.length)}
            paused={pauseSmall}
            setPaused={setPauseSmall}
          />
        </section>

        <section
          className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2"
          onMouseEnter={() => setTickerPaused(true)}
          onMouseLeave={() => setTickerPaused(false)}
          onTouchStart={() => setTickerPaused(true)}
          onTouchEnd={() => setTickerPaused(false)}
        >
          <div
            className={`kiosk-ticker-track ${tickerPaused || reducedMotion ? "paused" : ""}`}
            style={reducedMotion ? { animation: "none" } : undefined}
          >
            {[...tickerItems, ...tickerItems].map((item, idx) => (
              <span key={`${item}-${idx}`} className="whitespace-nowrap text-sm text-slate-200">
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-3">
          <article className={`kiosk-story rounded-xl border border-slate-700 bg-slate-900/75 p-3 ${storyIn || reducedMotion ? "in" : ""}`}>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Aujourd&apos;hui</p>
            <p className="mt-2 text-sm text-slate-100">Prochain: Rennes vs Cholet - 18:20</p>
            <p className="mt-1 text-sm text-emerald-300">Dernier: Rennes 3 - 1 Dammarie</p>
          </article>
          <article className={`kiosk-story rounded-xl border border-slate-700 bg-slate-900/75 p-3 ${storyIn || reducedMotion ? "in" : ""}`} style={{ transitionDelay: reducedMotion ? "0ms" : "90ms" }}>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Mon equipe</p>
            <div className="mt-2 flex items-center gap-2">
              <Logo value="RC" />
              <span className="text-sm text-slate-100">Rennes Cormorans</span>
            </div>
            <p className="mt-1 text-sm text-slate-300">Vestiaire C - Couloir Est</p>
          </article>
          <article className={`kiosk-story rounded-xl border border-slate-700 bg-slate-900/75 p-3 ${storyIn || reducedMotion ? "in" : ""}`} style={{ transitionDelay: reducedMotion ? "0ms" : "180ms" }}>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Challenge</p>
            <p className="mt-2 text-sm text-slate-100">Atelier Vitesse - En cours</p>
            <p className="mt-1 text-sm text-slate-300">Repas 12:30 - Zone Nord</p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 backdrop-blur-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-100">Equipes</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <article
                key={team.id}
                className="rounded-xl border border-slate-700 bg-slate-900/80 p-3 transition-colors hover:border-cyan-300/45 active:bg-slate-900"
              >
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
