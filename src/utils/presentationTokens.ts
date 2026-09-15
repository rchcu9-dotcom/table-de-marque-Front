import type { Edition } from "../api/types/inscription.types";
import type { PresentationStaticInfo } from "../config/presentationStaticInfo";

export type PresentationTokens = Record<string, string>;

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});

function formatDates(edition: Edition | null): string {
  if (!edition) return "";
  try {
    const debut = DATE_FORMAT.format(new Date(edition.dateDebut));
    const fin = DATE_FORMAT.format(new Date(edition.dateFinFin));
    return debut === fin ? debut : `${debut} - ${fin}`;
  } catch {
    return "";
  }
}

/**
 * Assemble les tokens {{...}} de la maquette à partir de l'édition en cours
 * (déjà publique via GET /inscription/edition/courante) et d'une config
 * statique front pour les valeurs sans champ backend (voir decisions.json).
 */
export function buildPresentationTokens(
  edition: Edition | null,
  staticInfo: PresentationStaticInfo,
): PresentationTokens {
  return {
    ville: staticInfo.ville,
    lieu: staticInfo.lieu,
    clubNom: staticInfo.clubNom,
    fraisCaution: staticInfo.fraisCaution,
    formatMatch: staticInfo.formatMatch,
    nomTournoi: edition?.nom ?? "",
    dates: formatDates(edition),
    nbEquipesMax: edition ? String(edition.nbPlacesMax) : "",
    fraisInscription: edition ? `${edition.fraisInscription} €` : "",
    prixRepas: edition ? `${edition.prixRepas} €` : "",
    anneeAge: edition?.anneesAge?.length
      ? edition.anneesAge.join(" / ")
      : "",
  };
}

const TOKEN_REGEX = /\{\{\s*(\w+)\s*\}\}/g;

/** Ne jette jamais : un token inconnu ou une valeur vide reste affiché tel quel plutôt que de casser le rendu. */
export function resolveTokens(text: string, tokens: PresentationTokens): string {
  return text.replace(TOKEN_REGEX, (full, key: string) =>
    Object.prototype.hasOwnProperty.call(tokens, key) && tokens[key]
      ? tokens[key]
      : full,
  );
}
