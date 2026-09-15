import { useState } from "react";
import type { UpdateEditionPayload } from "../../api/inscription";

type MessageField =
  | "msgBienvenue"
  | "msgFaisonsConnaissance"
  | "msgSelectionEquipe"
  | "msgAjoutEquipe"
  | "msgInscriptionEnCours"
  | "msgInscriptionValidee"
  | "msgLancerDemande"
  | "msgDemandeSoumise"
  | "msgEquipeRefusee"
  | "msgListeAttente"
  | "msgPaiementAttendu"
  | "msgChequeInfo1"
  | "msgChequeInfo2"
  | "msgInscriptionConfirmee"
  | "msgRenseigneJoueurs";

type Props = {
  values: Pick<UpdateEditionPayload, MessageField>;
  onChange: <K extends MessageField>(field: K, value: UpdateEditionPayload[K]) => void;
};

type MessageGroup = {
  title: string;
  fields: { field: MessageField; label: string; hint?: string }[];
};

// Chaque hint précise le déclencheur exact (étape ou statut de candidature) pour lever
// l'ambiguïté entre des noms de champs proches (ex. msgInscriptionConfirmee vs
// msgInscriptionValidee, qui ne correspondent PAS aux statuts qu'on devinerait à la lecture).
const MESSAGE_GROUPS: MessageGroup[] = [
  {
    title: "Accueil (avant le choix d'équipe)",
    fields: [
      {
        field: "msgBienvenue",
        label: "Message d'accueil",
        hint: "Affiché en haut du parcours, avant l'étape 1, dès l'arrivée sur le formulaire (aucune candidature en cours).",
      },
      {
        field: "msgFaisonsConnaissance",
        label: "Message « Faisons connaissance » (1ère connexion)",
        hint: "Affiché juste après la connexion, sur l'écran où le responsable choisit son pseudo — avant même le choix d'équipe.",
      },
    ],
  },
  {
    title: "Étape 1 — Sélection de l'équipe",
    fields: [
      { field: "msgSelectionEquipe", label: "Étape 1 : aide à la sélection d'équipe" },
      {
        field: "msgAjoutEquipe",
        label: "Étape 1 : message dans la fenêtre « Ajoute ton équipe »",
        hint: "Affiché en haut de la fenêtre ouverte via « Ton équipe n'est pas présente ? Ajoute-la ».",
      },
    ],
  },
  {
    title: "Étape 2 — Lancer la demande",
    fields: [
      { field: "msgLancerDemande", label: "Étape 2 : aide au-dessus du bouton « Lancer la demande »" },
      {
        field: "msgInscriptionEnCours",
        label: "Étape 2 : équipe déjà en cours d'inscription par un AUTRE responsable",
        hint: "Affiché quand l'équipe sélectionnée a déjà une candidature en cours soumise par quelqu'un d'autre — bloque le bouton « Lancer la demande ». Défaut : « L'inscription de cette équipe a déjà été demandée. Rapproche-toi du club ou du porteur de l'équipe... ».",
      },
    ],
  },
  {
    title: "Suivi de la candidature, par statut (après soumission)",
    fields: [
      {
        field: "msgDemandeSoumise",
        label: "Statut CANDIDATE : demande soumise, en attente de validation",
        hint: "Défaut : « Ta demande a bien été soumise. En attente de validation. ».",
      },
      { field: "msgListeAttente", label: "Message liste d'attente" },
      {
        field: "msgPaiementAttendu",
        label: "Statuts RÉSERVÉE / PAIEMENT ATTENDU : paiement attendu",
        hint: "Le jeton {{frais}} sera remplacé par le tarif d'inscription de l'édition (ex. 120,00 €).",
      },
      {
        field: "msgChequeInfo1",
        label: "Informations chèque (1)",
        hint: "Affiché juste sous le message « paiement attendu » ci-dessus (mêmes statuts).",
      },
      {
        field: "msgChequeInfo2",
        label: "Informations chèque (2)",
        hint: "Affiché juste sous « Informations chèque (1) » (mêmes statuts).",
      },
      {
        field: "msgInscriptionConfirmee",
        label: "Statut VALIDÉE : l'organisateur a confirmé l'équipe",
        hint: "Ne pas confondre avec « Statut DOSSIER COMPLET » plus bas (statut différent, plus tardif). Défaut : « Inscription confirmée ! ».",
      },
      {
        field: "msgRenseigneJoueurs",
        label: "Statut DOSSIER EN COURS : compléter le dossier joueurs/coachs",
      },
      {
        field: "msgInscriptionValidee",
        label: "Statut DOSSIER COMPLET : dossier validé (dernière étape du parcours)",
        hint: "Malgré son nom, ce message s'affiche APRÈS « Statut VALIDÉE » ci-dessus, une fois le dossier (joueurs/coachs) complété et validé. Défaut : « Le dossier de ton équipe a été validé par l'organisateur. ».",
      },
      { field: "msgEquipeRefusee", label: "Statut REFUSÉE" },
    ],
  },
];

const MESSAGE_FIELDS = MESSAGE_GROUPS.flatMap((g) => g.fields);

function toInputValue(value?: string | null): string {
  return value ?? "";
}

export default function EditionMessagesAccordion({ values, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <fieldset className="space-y-3">
      <legend className="w-full">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between text-slate-200 font-medium text-sm mb-2"
        >
          <span>Messages du parcours d'inscription ({MESSAGE_FIELDS.length})</span>
          <span className="text-slate-400 text-xs">{open ? "Replier ▲" : "Déplier ▼"}</span>
        </button>
      </legend>
      {open && (
        <div className="space-y-5">
          {MESSAGE_GROUPS.map((group) => (
            <div key={group.title} className="space-y-3">
              <h4 className="text-slate-300 text-xs font-semibold uppercase tracking-wide">
                {group.title}
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {group.fields.map(({ field, label, hint }) => (
                  <label key={field} className="text-xs text-slate-400 space-y-1">
                    {label}
                    <textarea
                      value={toInputValue(values[field])}
                      onChange={(e) => onChange(field, e.target.value)}
                      rows={2}
                      className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-sm"
                    />
                    {hint && <span className="block text-slate-500 italic">{hint}</span>}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </fieldset>
  );
}
