import { useSearchParams } from "react-router-dom";
import { useInscriptionSession } from "../hooks/useInscriptionSession";
import { useEditionEnPreparation } from "../hooks/useEditionEnPreparation";
import {
  useParametresSportifs,
  useUpdateParametresSportifs,
} from "../hooks/useParametresSportifs";
import {
  useEditionJours,
  useUpsertEditionJour,
  useDeleteEditionJour,
} from "../hooks/useEditionJours";
import {
  useActivitesCatalogue,
  useCreateActiviteCatalogue,
  useUpdateActiviteCatalogue,
  useDeleteActiviteCatalogue,
} from "../hooks/useActivitesCatalogue";
import {
  useCreneauxActivite,
  useCreateCreneauActivite,
  useUpdateCreneauActivite,
  useDeleteCreneauActivite,
} from "../hooks/useCreneauxActivite";
import ParametresTemporelsForm from "../components/planning/ParametresTemporelsForm";
import FormatCompetitionForm from "../components/planning/FormatCompetitionForm";
import EditionJoursTable from "../components/planning/EditionJoursTable";
import ActiviteCatalogueTable from "../components/planning/ActiviteCatalogueTable";
import CreneauxActiviteTable from "../components/planning/CreneauxActiviteTable";
import Spinner from "../components/ds/Spinner";
import Breadcrumbs from "../components/navigation/Breadcrumbs";
import { ACCUEIL_CRUMB, ADMIN_CRUMB } from "../components/navigation/breadcrumbItems";

export default function ParametresSportifsPage() {
  const { role, token, edition, isLoading: sessionLoading } = useInscriptionSession();
  const { data: editionEnPreparation } = useEditionEnPreparation(token);
  const [searchParams] = useSearchParams();
  // ?edition=demarree (lien "Paramètres sportifs" d'AdminPage) : consultation en lecture
  // seule de l'édition démarrée/active comme référence, même quand une édition en
  // préparation existe déjà — sinon la cible par défaut ci-dessous masquerait
  // silencieusement l'édition sortante dès qu'une préparation démarre. Un seul paramètre
  // pilote à la fois le ciblage et le readOnly : consulter l'édition démarrée hors de ce
  // contexte n'a pas de sens (elle est gelée), donc pas besoin d'un flag readOnly séparé.
  const consultationEditionDemarree = searchParams.get("edition") === "demarree";
  const readOnly = consultationEditionDemarree;
  // Cycle annuel de l'édition (spec §3) : pendant CREATION_NOUVEAU_TOURNOI,
  // ces paramètres ciblent l'édition en préparation, jamais l'édition
  // sortante toujours affichée au public — sauf consultation explicite ci-dessus.
  const editionId = consultationEditionDemarree
    ? edition?.id
    : (editionEnPreparation?.id ?? edition?.id);

  const {
    data: parametres,
    isLoading: parametresLoading,
    isError: parametresError,
    refetch: refetchParametres,
  } = useParametresSportifs(editionId, token);
  const { data: jours } = useEditionJours(editionId, token);
  const { data: activitesCatalogue } = useActivitesCatalogue(editionId, token);
  const { data: creneauxActivite } = useCreneauxActivite(editionId, token);

  const updateParametres = useUpdateParametresSportifs(editionId ?? 0, token ?? "");
  const upsertJour = useUpsertEditionJour(editionId ?? 0, token ?? "");
  const deleteJour = useDeleteEditionJour(editionId ?? 0, token ?? "");
  const createActivite = useCreateActiviteCatalogue(editionId ?? 0, token ?? "");
  const updateActivite = useUpdateActiviteCatalogue(editionId ?? 0, token ?? "");
  const deleteActivite = useDeleteActiviteCatalogue(editionId ?? 0, token ?? "");
  const createCreneau = useCreateCreneauActivite(editionId ?? 0, token ?? "");
  const updateCreneau = useUpdateCreneauActivite(editionId ?? 0, token ?? "");
  const deleteCreneau = useDeleteCreneauActivite(editionId ?? 0, token ?? "");

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
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumbs items={[ACCUEIL_CRUMB, ADMIN_CRUMB, { label: "Paramètres sportifs" }]} />
      <h1 className="text-slate-100 text-xl font-bold">Paramètres sportifs</h1>

      {readOnly && (
        <div className="bg-blue-950/40 border border-blue-800 rounded-lg px-4 py-2 text-sm text-blue-300">
          Consultation en lecture seule de l'édition démarrée — référence pour construire
          la nouvelle édition.
        </div>
      )}

      {parametresError ? (
        <div className="flex flex-col items-start gap-3 text-sm">
          <p className="text-red-400">
            Impossible de charger les paramètres sportifs.
          </p>
          <button
            type="button"
            onClick={() => void refetchParametres()}
            className="bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
          >
            Réessayer
          </button>
        </div>
      ) : parametresLoading || !parametres ? (
        <div className="flex items-center gap-2 text-slate-300 text-sm">
          <Spinner />
          <span>Chargement…</span>
        </div>
      ) : (
        <>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <ParametresTemporelsForm
              parametres={parametres}
              onSave={(payload) => updateParametres.mutate(payload)}
              isSaving={updateParametres.isPending}
              readOnly={readOnly}
            />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <FormatCompetitionForm
              parametres={parametres}
              onSave={(payload) => updateParametres.mutate(payload)}
              isSaving={updateParametres.isPending}
              readOnly={readOnly}
            />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <EditionJoursTable
              jours={jours ?? []}
              onUpsert={(payload) => upsertJour.mutate(payload)}
              onDelete={(numeroJour) => deleteJour.mutate(numeroJour)}
              isSaving={upsertJour.isPending || deleteJour.isPending}
              readOnly={readOnly}
            />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <ActiviteCatalogueTable
              activites={activitesCatalogue ?? []}
              onCreate={(payload) => createActivite.mutate(payload)}
              onUpdate={(id, payload) => updateActivite.mutate({ id, payload })}
              onDelete={(id) => deleteActivite.mutate(id)}
              isSaving={
                createActivite.isPending ||
                updateActivite.isPending ||
                deleteActivite.isPending
              }
              readOnly={readOnly}
            />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <CreneauxActiviteTable
              creneaux={creneauxActivite ?? []}
              activitesCatalogue={activitesCatalogue ?? []}
              onCreate={(payload) => createCreneau.mutate(payload)}
              onUpdate={(id, payload) => updateCreneau.mutate({ id, payload })}
              onDelete={(id) => deleteCreneau.mutate(id)}
              isSaving={
                createCreneau.isPending ||
                updateCreneau.isPending ||
                deleteCreneau.isPending
              }
              readOnly={readOnly}
            />
          </div>
        </>
      )}
    </div>
  );
}
