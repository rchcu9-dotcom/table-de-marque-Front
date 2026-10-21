import type { PresentationGroupe } from "../../api/presentation";
import type { ContentLang } from "../../utils/presentationContent";
import type { TournoiInfosLabels } from "../../utils/tournoiInfosLabels";
import PresentationChapterImage from "../presentation/PresentationChapterImage";
import TournoiInfosArticle, { type Translate } from "./TournoiInfosArticle";

type Props = {
  groupe: PresentationGroupe;
  index: number;
  t: Translate;
  lang: ContentLang;
  labels: TournoiInfosLabels;
  lieuUrl: string;
};

export default function TournoiInfosChapter({ groupe, index, t, lang, labels, lieuUrl }: Props) {
  const headingId = `tournoi-infos-chapitre-${index}`;

  return (
    <section
      className="tournoi-infos-chapter"
      aria-labelledby={headingId}
      data-testid={`tournoi-infos-chapter-${groupe.nom}`}
    >
      {/* Écran seulement : masquée à l'impression par presentation-chapter-image.css. */}
      <PresentationChapterImage src={groupe.imageUrl} />
      <h2 id={headingId} className="tournoi-infos-chapter-title">
        {t(groupe.nom, groupe.nomEn)}
      </h2>
      {groupe.articles.map((article, articleIndex) => (
        <TournoiInfosArticle
          // Le DTO public n'a pas d'id ; le titre peut se répéter d'un chapitre à l'autre.
          key={`${groupe.nom}-${articleIndex}`}
          article={article}
          t={t}
          lang={lang}
          labels={labels}
          lieuUrl={lieuUrl}
        />
      ))}
    </section>
  );
}
