import { useAuth } from "../auth/AuthContext";
import { useInscriptionSession } from "../hooks/useInscriptionSession";
import {
  usePresentationArticles,
  useCreatePresentationArticle,
  useUpdatePresentationArticle,
  useDeletePresentationArticle,
  useDeplacerPresentationArticle,
  useUpdatePresentationGroupe,
  useDeplacerPresentationGroupe,
  useDeletePresentationGroupe,
} from "../hooks/usePresentationArticles";
import PresentationArticlesAdmin from "../components/admin/PresentationArticlesAdmin";
import Spinner from "../components/ds/Spinner";
import Breadcrumbs from "../components/navigation/Breadcrumbs";
import { ACCUEIL_CRUMB, ADMIN_CRUMB } from "../components/navigation/breadcrumbItems";

export default function ParametresPresentationPage() {
  const { token } = useAuth();
  const { role, isLoading: sessionLoading } = useInscriptionSession();

  const {
    data: articles,
    isLoading: articlesLoading,
    isError: articlesError,
    refetch,
  } = usePresentationArticles(token);

  const createArticle = useCreatePresentationArticle(token ?? "");
  const updateArticle = useUpdatePresentationArticle(token ?? "");
  const deleteArticle = useDeletePresentationArticle(token ?? "");
  const deplacerArticle = useDeplacerPresentationArticle(token ?? "");
  const updateGroupe = useUpdatePresentationGroupe(token ?? "");
  const deplacerGroupe = useDeplacerPresentationGroupe(token ?? "");
  const deleteGroupe = useDeletePresentationGroupe(token ?? "");

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
      <Breadcrumbs items={[ACCUEIL_CRUMB, ADMIN_CRUMB, { label: "Présentation du tournoi" }]} />
      <h1 className="text-slate-100 text-xl font-bold">Présentation du tournoi</h1>

      {articlesError ? (
        <div className="flex flex-col items-start gap-3 text-sm">
          <p className="text-red-400">Impossible de charger le contenu de présentation.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
          >
            Réessayer
          </button>
        </div>
      ) : articlesLoading || !articles ? (
        <div className="flex items-center gap-2 text-slate-300 text-sm">
          <Spinner />
          <span>Chargement…</span>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <PresentationArticlesAdmin
            articles={articles}
            onCreate={(payload) => createArticle.mutate(payload)}
            onUpdate={(id, payload) => updateArticle.mutate({ id, payload })}
            onDelete={(id) => deleteArticle.mutate(id)}
            onDeplacerArticle={(id, direction) => deplacerArticle.mutate({ id, direction })}
            onUpdateGroupe={(groupe, payload) => updateGroupe.mutate({ groupe, payload })}
            onDeplacerGroupe={(groupe, direction) => deplacerGroupe.mutate({ groupe, direction })}
            onDeleteGroupe={(groupe) => deleteGroupe.mutate(groupe)}
            isSaving={
              createArticle.isPending ||
              updateArticle.isPending ||
              deleteArticle.isPending ||
              deplacerArticle.isPending ||
              updateGroupe.isPending ||
              deplacerGroupe.isPending ||
              deleteGroupe.isPending
            }
          />
        </div>
      )}
    </div>
  );
}
