import type {
  Edition,
  EditionEtape,
  StatutInscription,
} from '../../api/types/inscription.types';
import { afficheMessageVerrouillage, messageParcours } from './messagesParcours';

/** Marge de prudence : la limite réelle dépend du navigateur et de la messagerie. */
export const LONGUEUR_MAX_MAILTO = 1800;

export interface MailPorteur {
  a: string;
  cc: string | null;
  objet: string;
  texte: string;
}

export interface LienMail {
  href: string;
  /** Texte à copier avant d'ouvrir ; null si l'adresse le contient déjà. */
  texteACopier: string | null;
}

const OBJETS_PAR_STATUT: Record<StatutInscription, (tournoi: string) => string> = {
  CANDIDATE: (tournoi) => `Votre demande d'inscription au ${tournoi} a bien été reçue`,
  LISTE_ATTENTE: (tournoi) => `Vous êtes sur liste d'attente du ${tournoi}`,
  RESERVEE: (tournoi) => `Votre place au ${tournoi} : paiement attendu`,
  PAIEMENT_ATTENDU: (tournoi) => `Votre place au ${tournoi} : paiement attendu`,
  VALIDEE: (tournoi) => `Votre inscription au ${tournoi} est confirmée`,
  DOSSIER_EN_COURS: (tournoi) => `Complétez le dossier de votre équipe pour le ${tournoi}`,
  DOSSIER_COMPLET: (tournoi) => `Le dossier de votre équipe pour le ${tournoi} est validé`,
  REFUSEE: (tournoi) => `Votre demande d'inscription au ${tournoi} n'a pas pu être retenue`,
};

function objetMail(
  statut: StatutInscription,
  categorie: string,
  etape: EditionEtape | null,
): string {
  const tournoi = `tournoi RCHC ${categorie}`;
  return afficheMessageVerrouillage(statut, etape)
    ? `Les dossiers du ${tournoi} ne sont plus modifiables`
    : OBJETS_PAR_STATUT[statut](tournoi);
}

// Une image ne peut pas être jointe à un mailto:, et l'adresse du RIB exige d'être connecté :
// le mail renvoie vers l'application, jamais vers l'image.
function mentionRib(
  statut: StatutInscription,
  edition: Edition,
  origine: string,
): string | null {
  const paiementAttendu = statut === 'RESERVEE' || statut === 'PAIEMENT_ATTENDU';
  return paiementAttendu && (edition.hasImageRib || edition.imageRibUrl)
    ? `Le RIB est disponible sur l'application d'inscription : ${origine}/inscription`
    : null;
}

export function composerMailPorteur({
  email,
  statut,
  edition,
  etape,
  origine,
}: {
  email: string;
  statut: StatutInscription;
  edition: Edition;
  etape: EditionEtape | null;
  origine: string;
}): MailPorteur {
  const rib = mentionRib(statut, edition, origine);
  return {
    a: email.trim(),
    cc: edition.contactEmail?.trim() || null,
    objet: objetMail(statut, edition.categorie, etape),
    texte: [...messageParcours(statut, edition, etape), ...(rib ? [rib] : [])].join('\n\n'),
  };
}

// `@` reste en clair : toutes les messageries ne lisent pas %40 (RFC 6068).
function encoderAdresse(adresse: string): string {
  return encodeURIComponent(adresse).replace(/%40/g, '@');
}

function encoderTexte(texte: string): string {
  return encodeURIComponent(texte.replace(/\r\n|\r|\n/g, '\r\n'));
}

/**
 * Sans `texte`, le paramètre body est omis ; sans `cc`, le paramètre cc l'est aussi.
 * Pas d'URLSearchParams : il change les espaces en `+`, que les messageries affichent tels quels.
 */
export function construireMailto({
  a,
  cc,
  objet,
  texte,
}: {
  a: string;
  cc: string | null;
  objet: string;
  texte?: string;
}): string {
  const parametres = [
    ...(cc ? [`cc=${encoderAdresse(cc)}`] : []),
    `subject=${encoderTexte(objet)}`,
    ...(texte ? [`body=${encoderTexte(texte)}`] : []),
  ];
  return `mailto:${encoderAdresse(a)}?${parametres.join('&')}`;
}

export function preparerLienMail(mail: MailPorteur): LienMail {
  const complet = construireMailto(mail);
  return complet.length <= LONGUEUR_MAX_MAILTO
    ? { href: complet, texteACopier: null }
    : {
        href: construireMailto({ a: mail.a, cc: mail.cc, objet: mail.objet }),
        texteACopier: mail.texte,
      };
}
