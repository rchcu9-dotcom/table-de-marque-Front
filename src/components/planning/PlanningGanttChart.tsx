import type { SimulationResult } from "../../api/planning";

type Props = {
  simulation: SimulationResult;
};

type Barre = {
  debut: number;
  fin: number;
  couleur: string;
  label: string;
  tooltip: string;
};

type Ligne = {
  ref: string;
  nom: string;
  fictive: boolean;
  placeholder: boolean;
  barres: Barre[];
};

const COULEUR_MATCH = "#3b82f6";
// Catalogue d'Activités ouvert (plus de REPAS/CHALLENGE figés) : palette
// cyclique par activiteId plutôt que deux couleurs fixes.
const PALETTE_ACTIVITES = ["#22c55e", "#f97316", "#a855f7", "#eab308", "#06b6d4"];
function couleurActivite(activiteId: number): string {
  return PALETTE_ACTIVITES[activiteId % PALETTE_ACTIVITES.length];
}

const T_START = 8 * 60;
const T_END = 22 * 60;
const T_RANGE = T_END - T_START;
const LEFT = 130;
const ROW_H = 44;
const BAR_H = 22;
const BAR_Y = (ROW_H - BAR_H) / 2;
const CHART_W = 1000;
const HEADER_H = 28;

function minutesDepuisMinuit(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function xOf(min: number): number {
  return LEFT + ((min - T_START) / T_RANGE) * CHART_W;
}

function wOf(debut: number, fin: number): number {
  return Math.max(((fin - debut) / T_RANGE) * CHART_W, 4);
}

export default function PlanningGanttChart({ simulation }: Props) {
  const infoParRef = new Map(
    simulation.equipes.map((e) => [e.ref, { nom: e.nom, fictive: e.fictive }]),
  );
  const lignesParRef = new Map<string, Ligne>();

  const ligne = (ref: string, nomFallback: string): Ligne => {
    if (!lignesParRef.has(ref)) {
      const info = infoParRef.get(ref);
      lignesParRef.set(ref, {
        ref,
        nom: info?.nom ?? nomFallback,
        fictive: info?.fictive ?? false,
        // Convention déjà utilisée côté matchs (GenerationMatchsService) :
        // une ref "placeholder:..." est une place qualifiée pas encore
        // connue (ex. "1er Poule A"), à distinguer visuellement d'une
        // équipe fictive de simulation (ni la même origine, ni le même
        // impact sur la confirmation).
        placeholder: ref.startsWith("placeholder:"),
        barres: [],
      });
    }
    return lignesParRef.get(ref)!;
  };

  for (const m of simulation.matches) {
    const debut = minutesDepuisMinuit(m.dateHeure);
    const fin = debut + m.dureeMin;
    ligne(m.equipe1Ref, m.equipe1Nom).barres.push({
      debut,
      fin,
      couleur: COULEUR_MATCH,
      label: "M",
      tooltip: `Match vs ${m.equipe2Nom}`,
    });
    ligne(m.equipe2Ref, m.equipe2Nom).barres.push({
      debut,
      fin,
      couleur: COULEUR_MATCH,
      label: "M",
      tooltip: `Match vs ${m.equipe1Nom}`,
    });
  }
  for (const a of simulation.activites) {
    const debut = minutesDepuisMinuit(a.debut);
    const fin = minutesDepuisMinuit(a.fin);
    ligne(a.equipeRef, a.equipeNom).barres.push({
      debut,
      fin,
      couleur: couleurActivite(a.activiteId),
      label: a.activiteLabel.slice(0, 1).toUpperCase(),
      tooltip: a.activiteLabel,
    });
  }

  const lignes = [...lignesParRef.values()];
  const svgH = HEADER_H + lignes.length * ROW_H + 10;
  const svgW = LEFT + CHART_W + 10;
  const heures = [];
  for (let m = T_START; m <= T_END; m += 60) heures.push(m);

  return (
    <div className="overflow-x-auto bg-slate-950 rounded-lg border border-slate-700 p-2">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        role="img"
        aria-label="Gantt du planning simulé"
      >
        <rect x={0} y={0} width={svgW} height={svgH} fill="#0f172a" />
        {heures.map((m) => (
          <g key={m}>
            <line
              x1={xOf(m)}
              y1={HEADER_H}
              x2={xOf(m)}
              y2={svgH - 10}
              stroke="#1e3a5f"
              strokeWidth={1}
            />
            <text
              x={xOf(m)}
              y={HEADER_H - 6}
              fill="#64748b"
              fontSize={11}
              textAnchor="middle"
            >
              {String(Math.floor(m / 60)).padStart(2, "0")}:00
            </text>
          </g>
        ))}
        {lignes.map((row, i) => {
          const y = HEADER_H + i * ROW_H;
          return (
            <g key={row.ref}>
              <rect
                x={0}
                y={y}
                width={svgW}
                height={ROW_H}
                fill={i % 2 === 0 ? "#111827" : "#0f172a"}
              />
              <text
                x={LEFT - 8}
                y={y + ROW_H / 2 + 4}
                fill={row.fictive ? "#94a3b8" : row.placeholder ? "#fbbf24" : "#cbd5e1"}
                fontSize={12}
                textAnchor="end"
                fontWeight={500}
                fontStyle={row.fictive ? "italic" : "normal"}
              >
                {row.fictive
                  ? `${row.nom} (fictive)`
                  : row.placeholder
                    ? `${row.nom} (à déterminer)`
                    : row.nom}
              </text>
              <line
                x1={0}
                y1={y + ROW_H}
                x2={svgW}
                y2={y + ROW_H}
                stroke="#1e293b"
                strokeWidth={1}
              />
              {row.barres.map((barre, idx) => (
                <g key={idx}>
                  <rect
                    x={xOf(barre.debut)}
                    y={y + BAR_Y}
                    width={wOf(barre.debut, barre.fin)}
                    height={BAR_H}
                    fill={barre.couleur}
                    rx={4}
                    opacity={row.fictive ? 0.55 : 1}
                    strokeDasharray={row.fictive ? "2,2" : undefined}
                    stroke={row.fictive ? "#fff" : undefined}
                  >
                    <title>{barre.tooltip}</title>
                  </rect>
                  {wOf(barre.debut, barre.fin) > 28 && (
                    <text
                      x={xOf(barre.debut) + wOf(barre.debut, barre.fin) / 2}
                      y={y + BAR_Y + BAR_H / 2 + 4}
                      fill="#fff"
                      fontSize={10}
                      textAnchor="middle"
                      fontWeight={600}
                      pointerEvents="none"
                    >
                      {barre.label}
                    </text>
                  )}
                </g>
              ))}
            </g>
          );
        })}
        <line
          x1={LEFT}
          y1={HEADER_H}
          x2={LEFT}
          y2={svgH - 10}
          stroke="#334155"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
