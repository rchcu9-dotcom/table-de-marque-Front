import type { ArticlePresentation } from "../../api/presentation";
import { isInscriptionArticle, type ContentLang } from "../../utils/presentationContent";
import { parseFaits } from "../../utils/presentationFaits";
import {
  linkHostLabel,
  resolveArticleLink,
  sameHost,
  type ArticleLink as ArticleLinkTarget,
} from "../../utils/presentationLinks";
import { isLongArticle, isSameText, splitParagraphs } from "../../utils/tournoiInfosContent";
import type { TournoiInfosLabels } from "../../utils/tournoiInfosLabels";
import ArticleLink from "../presentation/ArticleLink";
import PresentationMapsLink from "../presentation/PresentationMapsLink";

/** Choisit la langue (repli FR) puis résout les tokens {{…}}. */
export type Translate = (fr: string, en: string) => string;

type Props = {
  article: ArticlePresentation;
  t: Translate;
  lang: ContentLang;
  labels: TournoiInfosLabels;
  /** Site du lieu (config statique), filet quand le lienUrl de l'article pointe ailleurs. */
  lieuUrl: string;
};

const SELF_PATH = "/tournoi/infos";

function isSelfLink(link: ArticleLinkTarget): boolean {
  return link.kind === "internal" && link.to.split(/[?#]/, 1)[0].toLowerCase() === SELF_PATH;
}

/**
 * Article en version « document » : titre (et non le titre choc de la présentation),
 * chapô, texte long, chiffres-clés, lieu et lien. Chaque bloc vide est omis.
 */
export default function TournoiInfosArticle({ article, t, lang, labels, lieuUrl }: Props) {
  const surtitre = t(article.surtitre, article.surtitreEn);
  const titre = t(article.titre, article.titreEn);
  const chapo = t(article.descriptionCourte, article.descriptionCourteEn);
  const texteLong = t(article.description, article.descriptionEn);
  const paragraphes = splitParagraphs(texteLong);
  const showChapo = chapo.trim() !== "" && !isSameText(chapo, texteLong);
  const faits = parseFaits(t(article.faits ?? "", article.faitsEn ?? ""));

  // Les URL (lienUrl, mapsQuery) ne passent jamais par t() : pas de token dans un lien.
  const lieu = article.lieu ? t(article.lieu, article.lieu) : "";
  const hasLieu = lieu.trim() !== "" || !!article.mapsQuery;

  const resolved = resolveArticleLink(
    isInscriptionArticle(article.titre) ? "/inscription" : article.lienUrl,
    lang,
  );
  const link = resolved && !isSelfLink(resolved) ? resolved : null;
  const showLieuUrl =
    hasLieu && lieuUrl !== "" && !(link?.kind === "external" && sameHost(link.href, lieuUrl));

  const linkLabel = link?.kind === "external" ? linkHostLabel(link.href) : labels.learnMore;

  return (
    <article
      className="tournoi-infos-article"
      data-long={isLongArticle(article.description) ? "true" : undefined}
      data-testid={`tournoi-infos-article-${article.titre}`}
    >
      {surtitre && <p className="tournoi-infos-eyebrow">{surtitre}</p>}
      <h3 className="tournoi-infos-article-title">{titre}</h3>

      {showChapo && <p className="tournoi-infos-chapo">{chapo}</p>}

      {paragraphes.map((paragraphe, index) => (
        <p key={index} className="tournoi-infos-paragraph">
          {paragraphe}
        </p>
      ))}

      {faits.length > 0 && (
        <dl className="tournoi-infos-facts" aria-label={labels.keyFacts} data-testid="tournoi-infos-facts">
          {faits.map((fait, index) => (
            <div key={index} className="tournoi-infos-fact">
              <dt>{fait.valeur}</dt>
              {fait.libelle && <dd>{fait.libelle}</dd>}
            </div>
          ))}
        </dl>
      )}

      {hasLieu && (
        <div className="tournoi-infos-lieu" data-testid="tournoi-infos-lieu">
          {lieu && <p className="tournoi-infos-lieu-adresse">{lieu}</p>}
          <PresentationMapsLink mapsQuery={article.mapsQuery} label={labels.map} />
          {showLieuUrl && (
            // Préfixe hors du lien : sur papier, un domaine seul sous « Voir sur la carte » serait ambigu.
            <p className="tournoi-infos-lieu-site" data-testid="tournoi-infos-lieu-site">
              {labels.venueWebsite}{" "}
              <ArticleLink
                link={{ kind: "external", href: lieuUrl }}
                className="tournoi-infos-link"
                data-testid="tournoi-infos-lieu-url"
              >
                {linkHostLabel(lieuUrl)}
              </ArticleLink>
            </p>
          )}
        </div>
      )}

      {link && (
        <p className="tournoi-infos-article-link">
          <ArticleLink
            link={link}
            className="tournoi-infos-link"
            data-testid="tournoi-infos-article-link"
            // Pas de printUrl : un lien externe a déjà son domaine pour libellé, lisible sur papier.
          >
            {linkLabel}
          </ArticleLink>
        </p>
      )}
    </article>
  );
}
