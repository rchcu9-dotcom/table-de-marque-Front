import type {
  Edition,
  EditionEtape,
  StatutInscription,
} from '../../api/types/inscription.types';
import { interpolerMsgPaiementAttendu } from '../../utils/msgPaiementAttendu';
import { msgOr } from '../../utils/msgOr';

export type EditionMessages = Pick<
  Edition,
  | 'fraisInscription'
  | 'msgDemandeSoumise'
  | 'msgListeAttente'
  | 'msgPaiementAttendu'
  | 'msgChequeInfo1'
  | 'msgChequeInfo2'
  | 'msgInscriptionConfirmee'
  | 'msgRenseigneJoueurs'
  | 'msgInscriptionValidee'
  | 'msgEquipeRefusee'
>;

const MESSAGE_DOSSIERS_VERROUILLES =
  'Le tournoi a démarré, les dossiers ne sont plus modifiables.';

// Source unique des textes du parcours : l'écran du responsable et le mail de l'organisateur
// doivent rester identiques.
const MESSAGES_PAR_STATUT: Record<
  StatutInscription,
  (edition: EditionMessages | null) => (string | null | undefined)[]
> = {
  CANDIDATE: (edition) => [
    msgOr(
      edition?.msgDemandeSoumise,
      'Ta demande a bien été soumise. En attente de validation.',
    ),
  ],
  LISTE_ATTENTE: (edition) => [
    msgOr(edition?.msgListeAttente, "Tu es sur liste d'attente."),
  ],
  RESERVEE: messagesPaiement,
  PAIEMENT_ATTENDU: messagesPaiement,
  VALIDEE: (edition) => [
    msgOr(edition?.msgInscriptionConfirmee, 'Inscription confirmée !'),
  ],
  DOSSIER_EN_COURS: (edition) => [
    msgOr(
      edition?.msgRenseigneJoueurs,
      "Complète le dossier de ton équipe (joueurs, coachs, droits à l'image).",
    ),
  ],
  DOSSIER_COMPLET: (edition) => [
    msgOr(
      edition?.msgInscriptionValidee,
      "Le dossier de ton équipe a été validé par l'organisateur.",
    ),
  ],
  REFUSEE: (edition) => [
    msgOr(
      edition?.msgEquipeRefusee,
      "Nous ne sommes malheureusement pas en mesure de confirmer l'inscription de ton équipe pour cette édition du tournoi. N'hésite pas à contacter l'organisateur si tu as des questions — et à retenter ta chance lors d'une prochaine édition !",
    ),
  ],
};

function messagesPaiement(edition: EditionMessages | null) {
  return [
    interpolerMsgPaiementAttendu(
      msgOr(edition?.msgPaiementAttendu, 'Paiement attendu.'),
      edition?.fraisInscription ?? 0,
    ),
    edition?.msgChequeInfo1,
    edition?.msgChequeInfo2,
  ];
}

export function estDossierVerrouille(
  statut: StatutInscription,
  etape: EditionEtape | null,
): boolean {
  return etape === 'TOURNOI_DEMARRE' && statut !== 'DOSSIER_COMPLET';
}

/** Le message de verrouillage ne remplace que les statuts qui invitent à remplir le dossier. */
export function afficheMessageVerrouillage(
  statut: StatutInscription,
  etape: EditionEtape | null,
): boolean {
  return (
    (statut === 'VALIDEE' || statut === 'DOSSIER_EN_COURS') &&
    estDossierVerrouille(statut, etape)
  );
}

/** Paragraphes non vides affichés au responsable pour ce statut. */
export function messageParcours(
  statut: StatutInscription,
  edition: EditionMessages | null,
  etape: EditionEtape | null,
): string[] {
  if (afficheMessageVerrouillage(statut, etape)) {
    return [MESSAGE_DOSSIERS_VERROUILLES];
  }
  return MESSAGES_PAR_STATUT[statut](edition).filter(
    (paragraphe): paragraphe is string => Boolean(paragraphe?.trim()),
  );
}
