import type { ContentLang } from "../../utils/presentationContent";
import type { TournoiInfosLabels } from "../../utils/tournoiInfosLabels";

type Props = {
  lang: ContentLang;
  labels: TournoiInfosLabels;
  /** Injectable pour les tests ; par défaut l'adresse publique de la page. */
  sourceUrl?: string;
  now?: Date;
};

/**
 * Visible à l'impression seulement : un PDF conservé ou transmis dit d'où il vient et
 * de quand datent ses informations (tarifs, dates peuvent changer d'une édition à l'autre).
 */
export default function TournoiInfosPrintFooter({ lang, labels, sourceUrl, now = new Date() }: Props) {
  const url = sourceUrl ?? `${window.location.origin}/tournoi/infos`;
  const date = new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  return (
    <footer className="tournoi-infos-print-footer" data-testid="tournoi-infos-print-footer">
      {labels.printSource(url, date)}
    </footer>
  );
}
