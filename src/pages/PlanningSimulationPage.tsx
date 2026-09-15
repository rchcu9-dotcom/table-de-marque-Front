import { useInscriptionSession } from "../hooks/useInscriptionSession";
import {
  usePlanningSimulationState,
  useSimulerPlanning,
  useConfirmerPlanning,
  useExporterSimulation,
} from "../hooks/usePlanningSimulation";
import SimulationControls from "../components/planning/SimulationControls";
import PlanningScoreHeader from "../components/planning/PlanningScoreHeader";
import PlanningViolationsBanner from "../components/planning/PlanningViolationsBanner";
import PlanningGanttChart from "../components/planning/PlanningGanttChart";
import Spinner from "../components/ds/Spinner";
import Breadcrumbs from "../components/navigation/Breadcrumbs";
import { ACCUEIL_CRUMB, ADMIN_CRUMB } from "../components/navigation/breadcrumbItems";

function telechargerHtml(contenu: string, nomFichier: string) {
  const blob = new Blob([contenu], { type: "text/html" });
  const lienUrl = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = lienUrl;
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(lienUrl);
}

export default function PlanningSimulationPage() {
  const { role, token, edition, isLoading: sessionLoading } = useInscriptionSession();
  const editionId = edition?.id ?? 0;

  const { data: simulation } = usePlanningSimulationState(editionId);
  const simuler = useSimulerPlanning(editionId, token ?? "");
  const confirmer = useConfirmerPlanning(editionId, token ?? "");
  const exporter = useExporterSimulation(editionId, token ?? "");

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (role !== "ORGANISATEUR") {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 text-slate-400 text-sm text-center">
        Réservé à l'organisateur.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <Breadcrumbs items={[ACCUEIL_CRUMB, ADMIN_CRUMB, { label: "Simulation de planning" }]} />
      <h1 className="text-slate-100 text-xl font-bold">
        Génération du planning
      </h1>

      <SimulationControls
        simulation={simulation ?? null}
        isSimulating={simuler.isPending}
        isExporting={exporter.isPending}
        isConfirming={confirmer.isPending}
        onSimuler={(nbEquipesCible) => simuler.mutate(nbEquipesCible)}
        onExporter={() => {
          if (!simulation) return;
          exporter.mutate(simulation.id, {
            onSuccess: (html) =>
              telechargerHtml(html, `planning-simulation-${simulation.id}.html`),
          });
        }}
        onConfirmer={(forcerEquipesFictives) =>
          confirmer.mutate(forcerEquipesFictives)
        }
      />

      {confirmer.isSuccess && (
        <div className="text-emerald-400 text-sm px-3 py-2 rounded bg-emerald-900/30 border border-emerald-700">
          Planning confirmé : {confirmer.data.nbMatchsCrees} match(s),{" "}
          {confirmer.data.nbActivitesCrees} activité(s) créée(s).
        </div>
      )}

      {simulation && (
        <>
          <PlanningScoreHeader simulation={simulation} />
          <PlanningViolationsBanner violations={simulation.violations} />
          <PlanningGanttChart simulation={simulation} />
        </>
      )}

      {!simulation && !simuler.isPending && (
        <p className="text-slate-400 text-sm">
          Aucune simulation générée — cliquer sur « Simuler » pour lancer une
          première passe.
        </p>
      )}
    </div>
  );
}
