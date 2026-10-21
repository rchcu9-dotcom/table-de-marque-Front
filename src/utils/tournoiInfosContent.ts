import type { PresentationGroupe } from "../api/presentation";
import type { Edition } from "../api/types/inscription.types";
import { isMediaGroup, isYoutubeArticle, type ContentLang } from "./presentationContent";

/** `?lang=en` (insensible à la casse) → anglais ; absent ou toute autre valeur → français. */
export function parseContentLang(raw: string | null): ContentLang {
  return raw?.trim().toLowerCase() === "en" ? "en" : "fr";
}

/**
 * Contenu de la page récapitulative : la présentation sans le chapitre Médias ni l'article
 * YouTube (renvois vers les réseaux, sans intérêt sur un document imprimé). Un chapitre vidé
 * par le filtre disparaît. L'ordre reçu de l'API (groupeOrdre puis ordre) est conservé.
 */
export function selectTournoiInfosGroupes(groupes: PresentationGroupe[]): PresentationGroupe[] {
  return groupes
    .filter((groupe) => !isMediaGroup(groupe.nom))
    .map((groupe) => ({
      ...groupe,
      articles: groupe.articles.filter((article) => !isYoutubeArticle(article.titre)),
    }))
    .filter((groupe) => groupe.articles.length > 0);
}

/**
 * Un paragraphe par bloc séparé d'une ou plusieurs lignes vides. Les retours à la ligne
 * simples restent dans le bloc (rendus en `white-space: pre-line`) : le règlement est saisi
 * en listes ligne à ligne qu'un <p> par ligne espacerait trop, surtout à l'impression.
 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\r?\n[ \t]*\r?\n/)
    .map((bloc) => bloc.trim())
    .filter((bloc) => bloc !== "");
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Deux textes identiques aux espaces près (chapô recopié du texte long, par exemple). */
export function isSameText(a: string, b: string): boolean {
  return normalizeSpaces(a) === normalizeSpaces(b);
}

/** Au-delà, un article ne tient plus sur une page A4 : on autorise sa coupure à l'impression. */
export const LONG_ARTICLE_THRESHOLD = 1500;

export function isLongArticle(description: string): boolean {
  return description.length > LONG_ARTICLE_THRESHOLD;
}

const FALLBACK_TITLE: Record<ContentLang, string> = {
  fr: "Tournoi U11 RCHC",
  en: "RCHC U11 Tournament",
};

const TITLE_SUFFIX: Record<ContentLang, string> = {
  fr: "Informations",
  en: "Information",
};

/**
 * Titre du document, repris par Chrome/Edge comme nom de fichier PDF proposé :
 * « Tournoi U11 RCHC – Informations 2027 ». L'année n'est pas doublée si le nom la contient.
 */
export function buildTournoiInfosTitle(edition: Edition | null, lang: ContentLang): string {
  const nom = edition?.nom?.trim() || FALLBACK_TITLE[lang];
  const annee = edition?.annee ? String(edition.annee) : "";
  const suffix = annee && !nom.includes(annee) ? `${TITLE_SUFFIX[lang]} ${annee}` : TITLE_SUFFIX[lang];
  return `${nom} – ${suffix}`;
}
