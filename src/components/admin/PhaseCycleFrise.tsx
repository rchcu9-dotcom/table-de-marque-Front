import type { EditionEtape } from "../../api/types/inscription.types";

type PhaseCle = "PREPARATION" | "INSCRIPTIONS_OUVERTES" | "CLOTUREE" | "TOURNOI_DEMARRE";

const PHASES: { cle: PhaseCle; label: string }[] = [
  { cle: "PREPARATION", label: "Préparation" },
  { cle: "INSCRIPTIONS_OUVERTES", label: "Inscriptions ouvertes" },
  { cle: "CLOTUREE", label: "Clôturée" },
  { cle: "TOURNOI_DEMARRE", label: "Tournoi démarré" },
];

function phaseDe(etape: EditionEtape | null): PhaseCle | null {
  switch (etape) {
    case "CREEE":
    case "CREATION_NOUVEAU_TOURNOI":
      return "PREPARATION";
    case "INSCRIPTIONS_OUVERTES":
    case "CLOTUREE":
    case "TOURNOI_DEMARRE":
      return etape;
    default:
      return null;
  }
}

function tooltipDe(phase: PhaseCle, etape: EditionEtape | null): string {
  const label = PHASES.find((p) => p.cle === phase)!.label;
  if (phase !== "PREPARATION") {
    return label;
  }
  const sousEtatActif =
    etape === "CREEE" || etape === "CREATION_NOUVEAU_TOURNOI" ? etape : null;
  const sousEtats = (["CREEE", "CREATION_NOUVEAU_TOURNOI"] as const)
    .map((s) => (s === sousEtatActif ? `${s} (actif)` : s))
    .join(" / ");
  return `${label} — ${sousEtats}`;
}

/**
 * Cycle conceptuel à 4 cases (spec docs/specs/frise-du-cycle-des-phases-...) :
 * CREEE/CREATION_NOUVEAU_TOURNOI sont regroupées visuellement sous
 * "Préparation" (mutuellement exclusives côté back).
 */
export default function PhaseCycleFrise({
  etape,
  size = "normal",
}: {
  etape: EditionEtape | null;
  size?: "normal" | "compact";
}) {
  const phaseCourante = phaseDe(etape);

  return (
    <div
      role="list"
      aria-label="Cycle des phases de l'édition"
      className="flex items-center gap-1.5"
    >
      {PHASES.map((phase, index) => {
        const estCourante = phase.cle === phaseCourante;
        return (
          <div key={phase.cle} className="flex items-center gap-1.5">
            <div
              role="listitem"
              title={tooltipDe(phase.cle, etape)}
              aria-current={estCourante ? "step" : undefined}
              className={
                estCourante
                  ? `rounded-full bg-emerald-500 text-slate-950 font-semibold whitespace-nowrap ${
                      size === "compact" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1.5 text-xs"
                    }`
                  : `rounded-full bg-slate-700 ${size === "compact" ? "w-2 h-2" : "w-2.5 h-2.5"}`
              }
            >
              {estCourante ? phase.label : null}
            </div>
            {index < PHASES.length - 1 && (
              <div
                className={`bg-slate-700 ${size === "compact" ? "w-3 h-px" : "w-4 h-px"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
