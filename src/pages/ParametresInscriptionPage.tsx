import { useState } from "react";
import { useInscriptionSession } from "../hooks/useInscriptionSession";
import { useEditionEnPreparation } from "../hooks/useEditionEnPreparation";
import { useUpdateEdition } from "../hooks/useUpdateEdition";
import type { UpdateEditionPayload } from "../api/inscription";
import type { Edition } from "../api/types/inscription.types";
import { validateEditionForm, type EditionValidationError } from "../utils/editionValidation";
import EditionIdentiteForm from "../components/admin/EditionIdentiteForm";
import EditionDatesForm from "../components/admin/EditionDatesForm";
import EditionTarifsForm from "../components/admin/EditionTarifsForm";
import EditionAnneesAgeForm from "../components/admin/EditionAnneesAgeForm";
import EditionContactImagesForm from "../components/admin/EditionContactImagesForm";
import EditionMessagesAccordion from "../components/admin/EditionMessagesAccordion";
import Spinner from "../components/ds/Spinner";
import Breadcrumbs from "../components/navigation/Breadcrumbs";
import { ACCUEIL_CRUMB, ADMIN_CRUMB } from "../components/navigation/breadcrumbItems";

function buildPayloadFromEdition(edition: Edition): UpdateEditionPayload {
  return {
    nom: edition.nom,
    categorie: edition.categorie,
    dateDebut: edition.dateDebut,
    dateFinDebut: edition.dateFinDebut,
    dateFinFin: edition.dateFinFin,
    fraisInscription: edition.fraisInscription,
    prixRepas: edition.prixRepas,
    nbPlacesMax: edition.nbPlacesMax,
    contactEmail: edition.contactEmail ?? "",
    contactPhone: edition.contactPhone ?? "",
    imageUrl: edition.imageUrl ?? "",
    imageDossierUrl: edition.imageDossierUrl ?? "",
    imageRibUrl: edition.imageRibUrl ?? "",
    msgBienvenue: edition.msgBienvenue ?? "",
    msgFaisonsConnaissance: edition.msgFaisonsConnaissance ?? "",
    msgSelectionEquipe: edition.msgSelectionEquipe ?? "",
    msgAjoutEquipe: edition.msgAjoutEquipe ?? "",
    msgInscriptionEnCours: edition.msgInscriptionEnCours ?? "",
    msgInscriptionValidee: edition.msgInscriptionValidee ?? "",
    msgLancerDemande: edition.msgLancerDemande ?? "",
    msgDemandeSoumise: edition.msgDemandeSoumise ?? "",
    msgEquipeRefusee: edition.msgEquipeRefusee ?? "",
    msgListeAttente: edition.msgListeAttente ?? "",
    msgPaiementAttendu: edition.msgPaiementAttendu ?? "",
    msgChequeInfo1: edition.msgChequeInfo1 ?? "",
    msgChequeInfo2: edition.msgChequeInfo2 ?? "",
    msgInscriptionConfirmee: edition.msgInscriptionConfirmee ?? "",
    msgRenseigneJoueurs: edition.msgRenseigneJoueurs ?? "",
  };
}

export default function ParametresInscriptionPage() {
  const { role, token, edition: editionActive, isLoading: sessionLoading } = useInscriptionSession();
  const { data: editionEnPreparation } = useEditionEnPreparation(token);
  // Cycle annuel de l'édition (spec §3) : pendant CREATION_NOUVEAU_TOURNOI,
  // ces paramètres ciblent l'édition en préparation, jamais l'édition
  // sortante toujours affichée au public.
  const edition = editionEnPreparation ?? editionActive;
  // Une édition en préparation naît directement à CREATION_NOUVEAU_TOURNOI (jamais CREEE) et
  // ne peut par construction avoir de candidature soumise avant INSCRIPTIONS_OUVERTES — le
  // warning ci-dessous (pensé pour l'édition active) serait donc un faux-positif permanent ici.
  const isPreparation = !!editionEnPreparation;
  const updateEdition = useUpdateEdition(edition?.id ?? 0, token ?? "");

  const [form, setForm] = useState<UpdateEditionPayload | null>(null);
  const [errors, setErrors] = useState<EditionValidationError[]>([]);
  const [saveMessage, setSaveMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);
  // Édition dont le formulaire local a été initialisé — évite un useEffect
  // pour dériver `form` de `edition` (setState synchrone en effet non
  // recommandé, cf. react-hooks/set-state-in-effect). Ajustement pendant le
  // rendu, pattern recommandé par React pour resynchroniser un state local
  // quand une prop/donnée externe change.
  const [formEditionId, setFormEditionId] = useState<number | null>(null);
  if (edition && edition.id !== formEditionId) {
    setFormEditionId(edition.id);
    setForm(buildPayloadFromEdition(edition));
  }

  const handleChange = <K extends keyof UpdateEditionPayload>(
    field: K,
    value: UpdateEditionPayload[K],
  ) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setSaveMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !edition) return;

    const validationErrors = validateEditionForm(form);
    setErrors(validationErrors);
    if (validationErrors.length > 0) {
      setSaveMessage(null);
      return;
    }

    updateEdition.mutate(form, {
      onSuccess: () => {
        setSaveMessage({ type: "success", text: "Paramètres d'inscription enregistrés." });
      },
      onError: () => {
        setSaveMessage({
          type: "error",
          text: "Impossible d'enregistrer les paramètres d'inscription.",
        });
      },
    });
  };

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
      <Breadcrumbs items={[ACCUEIL_CRUMB, ADMIN_CRUMB, { label: "Paramètres d'inscription" }]} />
      <h1 className="text-slate-100 text-xl font-bold">Paramètres d'inscription</h1>

      {!edition || !form ? (
        <div className="flex items-center gap-2 text-slate-300 text-sm">
          <Spinner />
          <span>Chargement…</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {!isPreparation && edition.etape !== "CREEE" && (
            <div className="text-amber-300 text-sm px-3 py-2 rounded bg-amber-900/30 border border-amber-700">
              L'édition n'est plus au stade "créée" ({edition.etape}) : modifier ces paramètres
              peut créer des incohérences avec des candidatures déjà soumises. Vérifiez l'impact
              avant d'enregistrer.
            </div>
          )}

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <EditionIdentiteForm values={form} errors={errors} onChange={handleChange} />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <EditionDatesForm values={form} errors={errors} onChange={handleChange} />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <EditionTarifsForm values={form} errors={errors} onChange={handleChange} />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <EditionAnneesAgeForm
              editionId={edition.id}
              anneesAge={edition.anneesAge}
              token={token ?? ""}
            />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <EditionContactImagesForm values={form} onChange={handleChange} />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <EditionMessagesAccordion values={form} onChange={handleChange} />
          </div>

          {saveMessage && (
            <div
              className={
                saveMessage.type === "success"
                  ? "text-emerald-400 text-sm px-3 py-2 rounded bg-emerald-900/30 border border-emerald-700"
                  : "text-red-400 text-sm px-3 py-2 rounded bg-red-900/30 border border-red-700"
              }
            >
              {saveMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={updateEdition.isPending}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg px-4 py-3 text-sm font-semibold text-slate-950 transition"
          >
            {updateEdition.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      )}
    </div>
  );
}
