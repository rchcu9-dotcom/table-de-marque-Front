import React from "react";
import { usePresentation } from "../hooks/usePresentation";
import { useInscriptionSession } from "../hooks/useInscriptionSession";
import { useContentLangParam } from "../hooks/useContentLangParam";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { getPresentationLieuUrl, getPresentationStaticInfo } from "../config/presentationStaticInfo";
import { pickLocalized } from "../utils/presentationContent";
import { buildPresentationTokens, resolveTokens } from "../utils/presentationTokens";
import { buildTournoiInfosTitle, selectTournoiInfosGroupes } from "../utils/tournoiInfosContent";
import { TOURNOI_INFOS_LABELS } from "../utils/tournoiInfosLabels";
import TournoiInfosHeader from "../components/tournoi-infos/TournoiInfosHeader";
import TournoiInfosChapter from "../components/tournoi-infos/TournoiInfosChapter";
import TournoiInfosPrintFooter from "../components/tournoi-infos/TournoiInfosPrintFooter";
import type { Translate } from "../components/tournoi-infos/TournoiInfosArticle";
// LanguageToggle et PresentationMapsLink sont stylés par presentation.css : importé ici
// plutôt que de compter sur l'import fait par PresentationTournoiPage.
import "../styles/presentation.css";
import "../styles/tournoi-infos.css";

/**
 * Page récapitulative publique /tournoi/infos : toute la présentation en version document
 * (textes longs, chiffres-clés, lieu), bilingue par ?lang=, imprimable en PDF. Accessible
 * à toutes les étapes de l'édition : aucune condition sur `etape`.
 * Seule à connaître les hooks de données ; les composants enfants sont purs.
 */
export default function TournoiInfosPage() {
  const { data, isLoading, isError } = usePresentation();
  const { edition } = useInscriptionSession();
  const [lang, setLang] = useContentLangParam();
  const labels = TOURNOI_INFOS_LABELS[lang];

  const staticInfo = React.useMemo(() => getPresentationStaticInfo(), []);
  const lieuUrl = React.useMemo(() => getPresentationLieuUrl(), []);
  const tokens = React.useMemo(
    () => buildPresentationTokens(edition, staticInfo),
    [edition, staticInfo],
  );
  const t = React.useCallback<Translate>(
    (fr, en) => resolveTokens(pickLocalized(lang, fr ?? "", en ?? ""), tokens),
    [lang, tokens],
  );
  const groupes = React.useMemo(() => (data ? selectTournoiInfosGroupes(data) : []), [data]);

  useDocumentTitle(buildTournoiInfosTitle(edition, lang));

  const title = tokens.nomTournoi || labels.fallbackTitle;
  // Morceaux non résolus omis : jamais de « {{dates}} » dans l'en-tête.
  const subtitle = [tokens.dates, tokens.lieu || tokens.ville].filter(Boolean).join(" · ");

  return (
    <div className="tournoi-infos" data-testid="tournoi-infos-page">
      <TournoiInfosHeader
        title={title}
        subtitle={subtitle}
        lang={lang}
        onLangChange={setLang}
        labels={labels}
        printDisabled={isLoading || isError || !data}
      />

      {isLoading ? (
        <p className="tournoi-infos-state" data-testid="tournoi-infos-loading">
          {labels.loading}
        </p>
      ) : isError || !data ? (
        <p className="tournoi-infos-state" data-testid="tournoi-infos-error">
          {labels.error}
        </p>
      ) : groupes.length === 0 ? (
        <p className="tournoi-infos-state" data-testid="tournoi-infos-empty">
          {labels.empty}
        </p>
      ) : (
        <>
          {groupes.map((groupe, index) => (
            <TournoiInfosChapter
              key={groupe.nom}
              groupe={groupe}
              index={index}
              t={t}
              lang={lang}
              labels={labels}
              lieuUrl={lieuUrl}
            />
          ))}
          <TournoiInfosPrintFooter lang={lang} labels={labels} />
        </>
      )}
    </div>
  );
}
