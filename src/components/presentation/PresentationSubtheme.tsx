import { Link } from "react-router-dom";
import type { ArticlePresentation } from "../../api/presentation";
import {
  isInscriptionArticle,
  pickLocalized,
  type ContentLang,
} from "../../utils/presentationContent";
import { parseFaits } from "../../utils/presentationFaits";
import { resolveTokens, type PresentationTokens } from "../../utils/presentationTokens";
import { getSubthemeHeadline } from "../../utils/presentationSubtheme";
import PresentationMapsLink from "./PresentationMapsLink";

type Props = {
  article: ArticlePresentation;
  tokens: PresentationTokens;
  lang: ContentLang;
  isActive: boolean;
};

export default function PresentationSubtheme({ article, tokens, lang, isActive }: Props) {
  const resolve = (fr: string, en: string) =>
    resolveTokens(pickLocalized(lang, fr, en), tokens);

  const surtitre = resolve(article.surtitre, article.surtitreEn);
  const faits = parseFaits(resolve(article.faits, article.faitsEn));

  // Le titre choc et la description courte sont ce qui s'affiche : conçus pour
  // le format cinématique (3-4 mots / 3 lignes max), contrairement à `titre`
  // (une simple étiquette, ex. « Informations ») et `description` (souvent
  // plusieurs paragraphes). Repli sur ces derniers tant qu'un article n'a pas
  // encore été complété, pour ne jamais afficher un écran sans texte.
  const headline = getSubthemeHeadline(article, lang, tokens);

  const descriptionCourte = resolve(article.descriptionCourte, article.descriptionCourteEn);
  const description = resolve(article.description, article.descriptionEn);
  const lede = descriptionCourte || description;

  const paragraphes = lede.split(/\r?\n+/).filter((p) => p.trim() !== "");
  const isInscription = isInscriptionArticle(article.titre);
  const href = isInscription ? "/inscription" : article.lienUrl;
  const ctaLabel = lang === "fr" ? "En savoir plus" : "Learn more";

  return (
    <div
      className={`presentation-subtheme${isActive ? " is-active" : ""}`}
      aria-hidden={!isActive}
      data-testid={`presentation-subtheme-${article.titre}`}
    >
      {surtitre && <p className="presentation-eyebrow">{surtitre}</p>}

      <h2 className="presentation-headline">{headline}</h2>

      {paragraphes.map((paragraphe, index) => (
        <p key={index} className="presentation-lede">
          {paragraphe}
        </p>
      ))}

      {faits.length > 0 && (
        <div className="presentation-facts" data-testid="presentation-facts">
          {faits.map((fait, index) => (
            <div key={index} className="presentation-fact">
              <b>{fait.valeur}</b>
              {fait.libelle && <small>{fait.libelle}</small>}
            </div>
          ))}
        </div>
      )}

      {(href || article.mapsQuery) && (
        <div className="presentation-links">
          {href &&
            (isInscription ? (
              <Link to={href} data-testid="presentation-subtheme-cta" className="presentation-cta">
                {ctaLabel}
              </Link>
            ) : (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="presentation-subtheme-cta"
                className="presentation-cta"
              >
                {ctaLabel}
              </a>
            ))}
          <PresentationMapsLink
            mapsQuery={article.mapsQuery}
            lieu={article.lieu}
            label={lang === "fr" ? "Voir sur la carte" : "View on map"}
          />
        </div>
      )}
    </div>
  );
}
