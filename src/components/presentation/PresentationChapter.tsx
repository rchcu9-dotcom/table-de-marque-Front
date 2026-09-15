import { useEffect, useRef, useState } from "react";
import type { PresentationGroupe } from "../../api/presentation";
import type { ContentLang } from "../../utils/presentationContent";
import type { PresentationTokens } from "../../utils/presentationTokens";
import { usePresentationAutoAdvance } from "../../hooks/usePresentationAutoAdvance";
import PresentationBgLayerCarousel from "./PresentationBgLayerCarousel";
import PresentationSubtheme from "./PresentationSubtheme";
import PresentationProgressSegments from "./PresentationProgressSegments";
import PresentationNextButton from "./PresentationNextButton";

type Props = {
  groupe: PresentationGroupe;
  index: number;
  total: number;
  tokens: PresentationTokens;
  lang: ContentLang;
  onNextPanel: () => void;
  onVisibleChange: (index: number, isVisible: boolean) => void;
};

export default function PresentationChapter({
  groupe,
  index,
  total,
  tokens,
  lang,
  onNextPanel,
  onVisibleChange,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(index === 0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      onVisibleChange(index, true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        onVisibleChange(index, entry.isIntersecting);
      },
      { threshold: 0.55 },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const { activeIndex, progressRatio, goTo, next } = usePresentationAutoAdvance(groupe, {
    isPaused: !isVisible,
  });

  const handleNext = () => {
    if (groupe.articles.length === 0 || activeIndex === groupe.articles.length - 1) {
      onNextPanel();
    } else {
      next();
    }
  };

  const nom = lang === "fr" ? groupe.nom : groupe.nomEn;
  const chapitreLabel = lang === "fr" ? "Chapitre" : "Chapter";
  const ecranLabel = lang === "fr" ? "Écran" : "Screen";

  // Un calque de fond par sous-écran, avec repli sur l'image du chapitre : c'est
  // ce qui donne le fondu enchaîné au fil du défilement automatique.
  const imageUrls = groupe.articles.length
    ? groupe.articles.map((article) => article.imageUrl ?? groupe.imageUrl)
    : [groupe.imageUrl];

  return (
    <section
      ref={sectionRef}
      id={`presentation-panneau-${index}`}
      data-testid={`presentation-chapter-${groupe.nom}`}
      className="presentation-panel"
    >
      <PresentationBgLayerCarousel
        imageUrls={imageUrls}
        activeIndex={activeIndex}
        enabled={isVisible}
      />

      <div className="presentation-content">
        <p className="presentation-chapter-eyebrow">
          {chapitreLabel} {index + 1} / {total} — {nom}
        </p>

        <PresentationProgressSegments
          count={groupe.articles.length}
          activeIndex={activeIndex}
          progressRatio={progressRatio}
          onSelect={goTo}
          label={ecranLabel}
        />

        <div className="presentation-subthemes">
          {groupe.articles.map((article, i) => (
            <PresentationSubtheme
              key={`${article.titre}-${i}`}
              article={article}
              tokens={tokens}
              lang={lang}
              isActive={i === activeIndex}
            />
          ))}
          {groupe.articles.length === 0 && <h2 className="presentation-headline">{nom}</h2>}
        </div>
      </div>

      <PresentationNextButton
        onClick={handleNext}
        label={lang === "fr" ? "Écran suivant" : "Next screen"}
      />
    </section>
  );
}
