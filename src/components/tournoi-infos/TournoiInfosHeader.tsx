import type { ContentLang } from "../../utils/presentationContent";
import type { TournoiInfosLabels } from "../../utils/tournoiInfosLabels";
import LanguageToggle from "../presentation/LanguageToggle";
import TournoiInfosPdfButton from "./TournoiInfosPdfButton";

type Props = {
  title: string;
  /** « dates · lieu », morceaux non résolus déjà omis ; vide → pas de ligne. */
  subtitle: string;
  lang: ContentLang;
  onLangChange: (lang: ContentLang) => void;
  labels: TournoiInfosLabels;
  printDisabled: boolean;
};

export default function TournoiInfosHeader({
  title,
  subtitle,
  lang,
  onLangChange,
  labels,
  printDisabled,
}: Props) {
  return (
    <header className="tournoi-infos-header">
      <div className="tournoi-infos-header-text">
        <h1 className="tournoi-infos-title">{title}</h1>
        {subtitle && <p className="tournoi-infos-subtitle">{subtitle}</p>}
      </div>
      <div className="tournoi-infos-actions no-print">
        <LanguageToggle lang={lang} onChange={onLangChange} />
        <TournoiInfosPdfButton label={labels.pdf} disabled={printDisabled} />
        <p className="tournoi-infos-pdf-help" data-testid="tournoi-infos-pdf-help">
          {labels.pdfHelp}
        </p>
      </div>
    </header>
  );
}
