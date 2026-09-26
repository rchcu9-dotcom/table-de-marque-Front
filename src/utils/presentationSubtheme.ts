import type { ArticlePresentation } from "../api/presentation";
import { pickLocalized, type ContentLang } from "./presentationContent";
import { resolveTokens, type PresentationTokens } from "./presentationTokens";

/**
 * Titre affiché d'un sous-écran : le titre choc, avec repli sur `titre` tant
 * que l'article n'a pas été complété. Partagé entre le rendu et l'annonce
 * aria-live de la navigation manuelle.
 */
export function getSubthemeHeadline(
  article: ArticlePresentation,
  lang: ContentLang,
  tokens: PresentationTokens,
): string {
  const titreAccroche = resolveTokens(
    pickLocalized(lang, article.titreAccroche, article.titreAccrocheEn),
    tokens,
  );
  const titre = resolveTokens(pickLocalized(lang, article.titre, article.titreEn), tokens);
  return titreAccroche || titre;
}
