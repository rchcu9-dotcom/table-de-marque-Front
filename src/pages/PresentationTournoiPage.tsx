import React from "react";
import { usePresentation } from "../hooks/usePresentation";
import { useInscriptionSession } from "../hooks/useInscriptionSession";
import { type ContentLang } from "../utils/presentationContent";
import { buildPresentationTokens } from "../utils/presentationTokens";
import { getPresentationStaticInfo } from "../config/presentationStaticInfo";
import LanguageToggle from "../components/presentation/LanguageToggle";
import PresentationRailNav from "../components/presentation/PresentationRailNav";
import PresentationChapter from "../components/presentation/PresentationChapter";
import PresentationOutro from "../components/presentation/PresentationOutro";
import "../styles/presentation.css";

export default function PresentationTournoiPage() {
  const { data: groupes, isLoading, isError } = usePresentation();
  const { edition } = useInscriptionSession();
  const [lang, setLang] = React.useState<ContentLang>("fr");
  const [activePanel, setActivePanel] = React.useState(0);
  // Pause explicite de l'avance automatique (WCAG 2.2.2) : vaut pour tous les chapitres.
  const [isUserPaused, setIsUserPaused] = React.useState(false);
  const visibleMapRef = React.useRef<Record<number, boolean>>({});

  const tokens = React.useMemo(
    () => buildPresentationTokens(edition, getPresentationStaticInfo()),
    [edition],
  );

  const handleVisibleChange = React.useCallback((index: number, isVisible: boolean) => {
    visibleMapRef.current = { ...visibleMapRef.current, [index]: isVisible };
    const visibleIndices = Object.entries(visibleMapRef.current)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    if (visibleIndices.length > 0) {
      setActivePanel(Math.min(...visibleIndices));
    }
  }, []);

  const scrollToPanel = React.useCallback((index: number) => {
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    document.getElementById(`presentation-panneau-${index}`)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    setActivePanel(index);
  }, []);

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-slate-400" data-testid="presentation-loading">
        Chargement...
      </div>
    );
  }

  if (isError || !groupes) {
    return (
      <div className="py-10 text-center text-sm text-slate-400" data-testid="presentation-error">
        Contenu de présentation indisponible pour le moment.
      </div>
    );
  }

  const outroIndex = groupes.length;
  const railLabels = [
    ...groupes.map((groupe) => (lang === "fr" ? groupe.nom : groupe.nomEn)),
    lang === "fr" ? "Fin" : "End",
  ];

  return (
    <div className="presentation-root" data-testid="presentation-page">
      <LanguageToggle lang={lang} onChange={setLang} />

      <PresentationRailNav
        labels={railLabels}
        activeIndex={activePanel}
        onSelect={scrollToPanel}
        navLabel={lang === "fr" ? "Chapitres" : "Chapters"}
      />

      <div className="presentation-scroller">
        {groupes.map((groupe, index) => (
          <PresentationChapter
            key={groupe.nom}
            groupe={groupe}
            index={index}
            total={groupes.length}
            tokens={tokens}
            lang={lang}
            onNextPanel={() => scrollToPanel(Math.min(index + 1, outroIndex))}
            onVisibleChange={handleVisibleChange}
            isActive={activePanel === index}
            isUserPaused={isUserPaused}
            onUserPausedChange={setIsUserPaused}
          />
        ))}

        <PresentationOutro
          index={outroIndex}
          lang={lang}
          onVisibleChange={handleVisibleChange}
        />
      </div>
    </div>
  );
}
