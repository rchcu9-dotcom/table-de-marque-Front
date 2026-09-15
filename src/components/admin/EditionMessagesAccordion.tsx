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

const MESSAGE_FIELDS: { field: MessageField; label: string; hint?: string }[] = [
  { field: "msgBienvenue", label: "Message de bienvenue" },
  { field: "msgFaisonsConnaissance", label: "Message « faisons connaissance »" },
  { field: "msgSelectionEquipe", label: "Message de sélection d'équipe" },
  { field: "msgAjoutEquipe", label: "Message d'ajout d'équipe" },
  { field: "msgInscriptionEnCours", label: "Message inscription en cours" },
  { field: "msgInscriptionValidee", label: "Message inscription validée" },
  { field: "msgLancerDemande", label: "Message « lancer la demande »" },
  { field: "msgDemandeSoumise", label: "Message demande soumise" },
  { field: "msgEquipeRefusee", label: "Message équipe refusée" },
  { field: "msgListeAttente", label: "Message liste d'attente" },
  {
    field: "msgPaiementAttendu",
    label: "Message paiement attendu",
    hint: "Le jeton {{frais}} sera remplacé par le tarif d'inscription de l'édition (ex. 120,00 €).",
  },
  { field: "msgChequeInfo1", label: "Informations chèque (1)" },
  { field: "msgChequeInfo2", label: "Informations chèque (2)" },
  { field: "msgInscriptionConfirmee", label: "Message inscription confirmée" },
  { field: "msgRenseigneJoueurs", label: "Message « renseigner les joueurs »" },
];

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
        <div className="grid grid-cols-1 gap-3">
          {MESSAGE_FIELDS.map(({ field, label, hint }) => (
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
      )}
    </fieldset>
  );
}
