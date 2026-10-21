import { useState } from "react";
import type {
  DeplacerDirection,
  PresentationArticle,
  UpdatePresentationGroupePayload,
  UpsertPresentationArticlePayload,
} from "../../api/presentation";
import { ServerError } from "../../api/errors";
import {
  PRESENTATION_IMAGE_URL_MAX_LENGTH,
  getPresentationImageUrlError,
  toPreviewImageUrl,
} from "../../utils/presentationImageUrl";

type Props = {
  articles: PresentationArticle[];
  onCreate: (payload: UpsertPresentationArticlePayload) => void;
  onUpdate: (id: number, payload: UpsertPresentationArticlePayload) => void;
  onDelete: (id: number) => void;
  onDeplacerArticle: (id: number, direction: DeplacerDirection) => void;
  /** Résolue une fois l'enregistrement fait : le formulaire du chapitre ne se ferme qu'en cas de succès. */
  onUpdateGroupe: (groupe: string, payload: UpdatePresentationGroupePayload) => Promise<void>;
  onDeplacerGroupe: (groupe: string, direction: DeplacerDirection) => void;
  onDeleteGroupe: (groupe: string) => void;
  isSaving: boolean;
};

const EMPTY_FORM: UpsertPresentationArticlePayload = {
  groupe: "",
  groupeEn: "",
  surtitre: "",
  surtitreEn: "",
  titre: "",
  titreEn: "",
  description: "",
  descriptionEn: "",
  faits: "",
  faitsEn: "",
  titreAccroche: "",
  titreAccrocheEn: "",
  descriptionCourte: "",
  descriptionCourteEn: "",
  imageUrl: "",
  lienUrl: "",
  lieu: "",
  mapsQuery: "",
  ordre: 0,
};

function toPayload(article: PresentationArticle): UpsertPresentationArticlePayload {
  return {
    groupe: article.groupe,
    groupeEn: article.groupeEn,
    surtitre: article.surtitre,
    surtitreEn: article.surtitreEn,
    titre: article.titre,
    titreEn: article.titreEn,
    description: article.description,
    descriptionEn: article.descriptionEn,
    faits: article.faits,
    faitsEn: article.faitsEn,
    titreAccroche: article.titreAccroche,
    titreAccrocheEn: article.titreAccrocheEn,
    descriptionCourte: article.descriptionCourte,
    descriptionCourteEn: article.descriptionCourteEn,
    imageUrl: article.imageUrl ?? "",
    lienUrl: article.lienUrl ?? "",
    lieu: article.lieu ?? "",
    mapsQuery: article.mapsQuery ?? "",
    ordre: article.ordre,
  };
}

function ArticleForm({
  initial,
  onSubmit,
  onCancel,
  isSaving,
  submitLabel,
}: {
  initial: UpsertPresentationArticlePayload;
  onSubmit: (payload: UpsertPresentationArticlePayload) => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState(initial);

  const set = <K extends keyof UpsertPresentationArticlePayload>(
    field: K,
    value: UpsertPresentationArticlePayload[K],
  ) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.groupe.trim() || !form.titre.trim()) return;
    onSubmit({
      ...form,
      groupe: form.groupe.trim(),
      titre: form.titre.trim(),
      groupeEn: form.groupeEn.trim() || form.groupe.trim(),
      surtitre: form.surtitre.trim(),
      surtitreEn: form.surtitreEn.trim() || form.surtitre.trim(),
      titreEn: form.titreEn.trim() || form.titre.trim(),
      faitsEn: form.faitsEn.trim() || form.faits.trim(),
      titreAccroche: form.titreAccroche.trim(),
      titreAccrocheEn: form.titreAccrocheEn.trim() || form.titreAccroche.trim(),
      descriptionCourte: form.descriptionCourte.trim(),
      descriptionCourteEn: form.descriptionCourteEn.trim() || form.descriptionCourte.trim(),
      imageUrl: form.imageUrl?.trim() || null,
      lienUrl: form.lienUrl?.trim() || null,
      lieu: form.lieu?.trim() || null,
      mapsQuery: form.mapsQuery?.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 px-3 py-3 rounded bg-slate-800 border border-slate-600">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-400 space-y-1">
          Groupe
          <input
            type="text"
            value={form.groupe}
            onChange={(e) => set("groupe", e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
            required
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Groupe (EN)
          <input
            type="text"
            value={form.groupeEn}
            onChange={(e) => set("groupeEn", e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Surtitre
          <input
            type="text"
            value={form.surtitre}
            onChange={(e) => set("surtitre", e.target.value)}
            placeholder="Résumé, Inscriptions, Repas…"
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Surtitre (EN)
          <input
            type="text"
            value={form.surtitreEn}
            onChange={(e) => set("surtitreEn", e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Titre
          <input
            type="text"
            value={form.titre}
            onChange={(e) => set("titre", e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
            required
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Titre (EN)
          <input
            type="text"
            value={form.titreEn}
            onChange={(e) => set("titreEn", e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
      </div>

      <label className="text-xs text-slate-400 space-y-1">
        Description
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
        />
      </label>
      <label className="text-xs text-slate-400 space-y-1">
        Description (EN)
        <textarea
          value={form.descriptionEn}
          onChange={(e) => set("descriptionEn", e.target.value)}
          rows={4}
          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-2 rounded border border-blue-900/40 bg-blue-950/20 p-2">
        <p className="col-span-2 text-xs text-blue-300">
          Ce qui s'affiche réellement sur la page d'accueil, en grand — à la place de Titre et
          Description ci-dessus.
        </p>
        <label className="text-xs text-slate-400 space-y-1">
          Titre accroche — 3 à 4 mots
          <input
            type="text"
            value={form.titreAccroche}
            onChange={(e) => set("titreAccroche", e.target.value)}
            maxLength={100}
            placeholder="Le tournoi arrive."
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Titre accroche (EN)
          <input
            type="text"
            value={form.titreAccrocheEn}
            onChange={(e) => set("titreAccrocheEn", e.target.value)}
            maxLength={100}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1 col-span-2">
          Description courte — 3 lignes max ({form.descriptionCourte.length}/320)
          <textarea
            value={form.descriptionCourte}
            onChange={(e) => set("descriptionCourte", e.target.value)}
            rows={2}
            maxLength={320}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1 col-span-2">
          Description courte (EN)
          <textarea
            value={form.descriptionCourteEn}
            onChange={(e) => set("descriptionCourteEn", e.target.value)}
            rows={2}
            maxLength={320}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-400 space-y-1">
          Chiffres-clés — une ligne par fait, format <code>valeur|libellé</code>
          <textarea
            value={form.faits ?? ""}
            onChange={(e) => set("faits", e.target.value)}
            rows={3}
            placeholder={"270 €|Par équipe\n12|Équipes"}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm font-mono"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Chiffres-clés (EN)
          <textarea
            value={form.faitsEn ?? ""}
            onChange={(e) => set("faitsEn", e.target.value)}
            rows={3}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm font-mono"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-400 space-y-1">
          Image de fond (URL) — lien de partage Google Drive accepté
          <input
            type="text"
            value={form.imageUrl ?? ""}
            onChange={(e) => set("imageUrl", e.target.value)}
            placeholder="https://drive.google.com/file/d/…/view"
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Lien
          <input
            type="text"
            value={form.lienUrl ?? ""}
            onChange={(e) => set("lienUrl", e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Lieu
          <input
            type="text"
            value={form.lieu ?? ""}
            onChange={(e) => set("lieu", e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Maps
          <input
            type="text"
            value={form.mapsQuery ?? ""}
            onChange={(e) => set("mapsQuery", e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Ordre
          <input
            type="number"
            value={form.ordre}
            onChange={(e) => set("ordre", parseInt(e.target.value, 10) || 0)}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isSaving}
          className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium disabled:opacity-50"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

function groupArticles(articles: PresentationArticle[]): [string, PresentationArticle[]][] {
  const byGroupe = new Map<string, PresentationArticle[]>();
  for (const article of articles) {
    const list = byGroupe.get(article.groupe) ?? [];
    list.push(article);
    byGroupe.set(article.groupe, list);
  }
  return Array.from(byGroupe.entries()).sort(
    ([, a], [, b]) => (a[0]?.groupeOrdre ?? 0) - (b[0]?.groupeOrdre ?? 0),
  );
}

function messageOf(error: unknown): string {
  return error instanceof ServerError ? error.message : "Enregistrement impossible, réessayez.";
}

/**
 * Miniature de l'URL saisie : un lien Drive passe par le relais du back (cf. toPreviewImageUrl).
 * Un échec de chargement signale le plus souvent un lien Drive non partagé publiquement.
 */
function GroupeImagePreview({ url }: { url: string }) {
  const previewUrl = toPreviewImageUrl(url);
  // Mémorise l'URL en échec plutôt qu'un booléen : l'aperçu se réarme dès que l'URL change.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!previewUrl) return null;
  if (failedUrl === previewUrl) {
    return (
      <p className="text-xs text-amber-400" data-testid="groupe-image-preview-error">
        Image introuvable — vérifiez que le lien Drive est partagé à « tous les utilisateurs
        disposant du lien ».
      </p>
    );
  }
  return (
    <img
      src={previewUrl}
      alt="Aperçu de l'image du chapitre"
      loading="lazy"
      onError={() => setFailedUrl(previewUrl)}
      className="w-40 h-[90px] object-cover rounded border border-slate-600"
      data-testid="groupe-image-preview"
    />
  );
}

function GroupeMetaForm({
  groupe,
  groupeEn,
  dureeMs,
  imageUrl,
  error,
  onSubmit,
  onCancel,
  isSaving,
}: {
  groupe: string;
  groupeEn: string;
  dureeMs: number;
  imageUrl: string | null;
  /** Erreur renvoyée par le back au dernier enregistrement (ex. 400 de validation). */
  error?: string | null;
  onSubmit: (payload: UpdatePresentationGroupePayload) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [nom, setNom] = useState(groupe);
  const [nomEn, setNomEn] = useState(groupeEn);
  const [duree, setDuree] = useState(dureeMs);
  const [image, setImage] = useState(imageUrl ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  const imageError = localError ?? error ?? null;
  const imageErrorId = `groupe-image-error-${groupe}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    const urlError = getPresentationImageUrlError(image);
    setLocalError(urlError);
    if (urlError) return;
    onSubmit({
      nom: nom.trim(),
      nomEn: nomEn.trim() || nom.trim(),
      dureeMs: duree,
      imageUrl: image.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 px-3 py-3 rounded bg-slate-800 border border-slate-600">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-400 space-y-1">
          Nom du chapitre
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
            required
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Nom (EN)
          <input
            type="text"
            value={nomEn}
            onChange={(e) => setNomEn(e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1">
          Durée d'affichage (ms)
          <input
            type="number"
            min={500}
            value={duree}
            onChange={(e) => setDuree(parseInt(e.target.value, 10) || 5000)}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
          />
        </label>
        <div className="space-y-1">
          <label className="text-xs text-slate-400 space-y-1 block">
            Image de fond (URL)
            <input
              type="url"
              value={image}
              maxLength={PRESENTATION_IMAGE_URL_MAX_LENGTH}
              onChange={(e) => {
                setImage(e.target.value);
                setLocalError(null);
              }}
              aria-invalid={imageError ? true : undefined}
              aria-describedby={imageError ? imageErrorId : undefined}
              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm"
              data-testid="groupe-image-input"
            />
          </label>
          {imageError && (
            <p id={imageErrorId} role="alert" className="text-xs text-red-400" data-testid="groupe-image-error">
              {imageError}
            </p>
          )}
          <GroupeImagePreview url={image} />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isSaving}
          className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium disabled:opacity-50"
        >
          Enregistrer le chapitre
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

export default function PresentationArticlesAdmin({
  articles,
  onCreate,
  onUpdate,
  onDelete,
  onDeplacerArticle,
  onUpdateGroupe,
  onDeplacerGroupe,
  onDeleteGroupe,
  isSaving,
}: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingGroupe, setEditingGroupeState] = useState<string | null>(null);
  const [groupeError, setGroupeError] = useState<string | null>(null);
  const [addingToGroupe, setAddingToGroupe] = useState<string | null>(null);

  // Ouvrir, changer ou fermer le chapitre édité efface l'erreur du précédent enregistrement.
  const setEditingGroupe = (groupe: string | null) => {
    setEditingGroupeState(groupe);
    setGroupeError(null);
  };
  const [addingNewGroupe, setAddingNewGroupe] = useState(false);

  const groups = groupArticles(articles);
  const maxOrdre = articles.reduce((max, a) => Math.max(max, a.ordre), -1);

  return (
    <div className="space-y-4">
      <h3 className="text-slate-200 font-medium text-sm">
        Contenu de présentation du tournoi ({articles.length} articles)
      </h3>
      <p className="text-xs text-slate-500">
        Affiché sur la page d'accueil pendant la phase d'inscriptions ouvertes. Un chapitre
        = un panneau plein écran, ses articles = les sous-écrans qui défilent. Les images
        acceptent un lien de partage Google Drive tel quel (le partage doit être « tous
        les utilisateurs disposant du lien »), converti automatiquement en image affichable.
      </p>

      {groups.map(([groupe, groupArticlesList], groupIndex) => {
        const groupeEn = groupArticlesList[0]?.groupeEn ?? groupe;
        const groupeDureeMs = groupArticlesList[0]?.groupeDureeMs ?? 5000;
        const groupeImageUrl = groupArticlesList[0]?.groupeImageUrl ?? null;

        return (
          <div key={groupe} className="border border-slate-700 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-slate-300 font-semibold text-sm">{groupe}</h4>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onDeplacerGroupe(groupe, "haut")}
                  disabled={groupIndex === 0}
                  className="text-slate-400 hover:text-slate-200 text-xs disabled:opacity-30"
                  aria-label="Monter le chapitre"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => onDeplacerGroupe(groupe, "bas")}
                  disabled={groupIndex === groups.length - 1}
                  className="text-slate-400 hover:text-slate-200 text-xs disabled:opacity-30"
                  aria-label="Descendre le chapitre"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => setEditingGroupe(editingGroupe === groupe ? null : groupe)}
                  className="text-blue-400 hover:text-blue-300 text-xs"
                >
                  Modifier le chapitre
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const confirmed =
                      groupArticlesList.length === 0 ||
                      window.confirm(
                        `Supprimer le chapitre « ${groupe} » et ses ${groupArticlesList.length} article(s) ?`,
                      );
                    if (confirmed) onDeleteGroupe(groupe);
                  }}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Supprimer le chapitre
                </button>
              </div>
            </div>

            {editingGroupe === groupe && (
              <GroupeMetaForm
                groupe={groupe}
                groupeEn={groupeEn}
                dureeMs={groupeDureeMs}
                imageUrl={groupeImageUrl}
                error={groupeError}
                onSubmit={async (payload) => {
                  setGroupeError(null);
                  try {
                    await onUpdateGroupe(groupe, payload);
                    setEditingGroupe(null);
                  } catch (error) {
                    // Le formulaire reste ouvert pour que l'organisateur corrige sa saisie.
                    setGroupeError(messageOf(error));
                  }
                }}
                onCancel={() => setEditingGroupe(null)}
                isSaving={isSaving}
              />
            )}

            {groupArticlesList.map((article, articleIndex) =>
              editingId === article.id ? (
                <ArticleForm
                  key={article.id}
                  initial={toPayload(article)}
                  onSubmit={(payload) => {
                    onUpdate(article.id, payload);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                  isSaving={isSaving}
                  submitLabel="Enregistrer"
                />
              ) : (
                <div
                  key={article.id}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-slate-800/60 border border-slate-700"
                >
                  <span className="text-sm text-slate-200 truncate">{article.titre}</span>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onDeplacerArticle(article.id, "haut")}
                      disabled={articleIndex === 0}
                      className="text-slate-400 hover:text-slate-200 text-xs disabled:opacity-30"
                      aria-label="Monter l'article"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeplacerArticle(article.id, "bas")}
                      disabled={articleIndex === groupArticlesList.length - 1}
                      className="text-slate-400 hover:text-slate-200 text-xs disabled:opacity-30"
                      aria-label="Descendre l'article"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(article.id)}
                      className="text-blue-400 hover:text-blue-300 text-xs"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(article.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ),
            )}

            {addingToGroupe === groupe ? (
              <ArticleForm
                initial={{ ...EMPTY_FORM, groupe, groupeEn, ordre: maxOrdre + 1 }}
                onSubmit={(payload) => {
                  onCreate(payload);
                  setAddingToGroupe(null);
                }}
                onCancel={() => setAddingToGroupe(null)}
                isSaving={isSaving}
                submitLabel="Créer"
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingToGroupe(groupe)}
                className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium"
              >
                + Ajouter un article dans « {groupe} »
              </button>
            )}
          </div>
        );
      })}

      {addingNewGroupe ? (
        <ArticleForm
          initial={{ ...EMPTY_FORM, ordre: maxOrdre + 1 }}
          onSubmit={(payload) => {
            onCreate(payload);
            setAddingNewGroupe(false);
          }}
          onCancel={() => setAddingNewGroupe(false)}
          isSaving={isSaving}
          submitLabel="Créer"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAddingNewGroupe(true)}
          className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium"
        >
          + Ajouter un nouveau groupe
        </button>
      )}
    </div>
  );
}
