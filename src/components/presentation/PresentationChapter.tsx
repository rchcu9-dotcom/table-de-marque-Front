import { useEffect, useRef, useState } from "react";
import type React from "react";
import type { PresentationGroupe } from "../../api/presentation";
import type { ContentLang } from "../../utils/presentationContent";
import type { PresentationTokens } from "../../utils/presentationTokens";
import { canNext, canPrev } from "../../utils/presentationSubscreenNav";
import { getSubthemeHeadline } from "../../utils/presentationSubtheme";
import { usePresentationAutoAdvance } from "../../hooks/usePresentationAutoAdvance";
import { usePresentationGestures } from "../../hooks/usePresentationGestures";
import { usePresentationKeyboardNav } from "../../hooks/usePresentationKeyboardNav";
import PresentationBgLayerCarousel from "./PresentationBgLayerCarousel";
import PresentationSubtheme from "./PresentationSubtheme";
import PresentationProgressSegments from "./PresentationProgressSegments";
import PresentationPlayPauseButton from "./PresentationPlayPauseButton";
import PresentationSubscreenNav from "./PresentationSubscreenNav";
import PresentationNextButton from "./PresentationNextButton";

type Props = {
  groupe: PresentationGroupe;
  index: number;
  total: number;
  tokens: PresentationTokens;
  lang: ContentLang;
  onNextPanel: () => void;
  onVisibleChange: (index: number, isVisible: boolean) => void;
  /** Chapitre actif de la page (activePanel === index) : seul à écouter ←/→. */
  isActive: boolean;
  /** Pause explicite globale, portée par la page. */
  isUserPaused: boolean;
  onUserPausedChange: (paused: boolean) => void;
};

type ManualAction = { type: "prev" } | { type: "next" } | { type: "goto"; index: number };

/** Focus clavier uniquement : un clic souris ou un tap ne doit pas figer l'avance. */
function isKeyboardFocus(target: EventTarget | null): boolean {
  const el = target as Element | null;
  if (!el || typeof el.matches !== "function") return false;
  try {
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
}

export default function PresentationChapter({
  groupe,
  index,
  total,
  tokens,
  lang,
  onNextPanel,
  onVisibleChange,
  isActive,
  isUserPaused,
  onUserPausedChange,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(index === 0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isTouchHeld, setIsTouchHeld] = useState(false);
  const [announcement, setAnnouncement] = useState("");

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

  const count = groupe.articles.length;
  const {
    activeIndex,
    progressRatio,
    canAutoAdvance,
    canPrev: hasPrev,
    canNext: hasNext,
    isSuspended,
    goTo,
    prev,
    next,
    resume,
  } = usePresentationAutoAdvance(groupe, {
    isPaused: !isVisible,
    isHoldPaused: isHovered || isFocusWithin || isTouchHeld,
    isUserPaused,
  });

  // Point d'entrée unique de toute navigation manuelle (chevrons, clavier, gestes,
  // segments) : c'est aussi la seule source des annonces aria-live, l'avance
  // automatique n'étant jamais annoncée.
  const navigateManually = (action: ManualAction) => {
    let target = activeIndex;
    if (action.type === "prev") {
      if (canPrev(activeIndex)) target = activeIndex - 1;
      prev();
    } else if (action.type === "next") {
      if (canNext(activeIndex, count)) target = activeIndex + 1;
      next();
    } else {
      if (action.index >= 0 && action.index < count) target = action.index;
      goTo(action.index);
    }
    if (target !== activeIndex) {
      setAnnouncement(getSubthemeHeadline(groupe.articles[target], lang, tokens));
    }
  };

  const hasSubscreens = count > 1;

  usePresentationKeyboardNav({
    enabled: isActive && hasSubscreens,
    onPrev: () => navigateManually({ type: "prev" }),
    onNext: () => navigateManually({ type: "next" }),
  });

  const gestureHandlers = usePresentationGestures({
    enabled: hasSubscreens,
    onPrev: () => navigateManually({ type: "prev" }),
    onNext: () => navigateManually({ type: "next" }),
    onHoldChange: setIsTouchHeld,
  });

  const handleTogglePlay = () => {
    if (isUserPaused || isSuspended) {
      onUserPausedChange(false);
      resume();
      // « Lecture » est une intention explicite : le pointeur (ou le focus clavier)
      // est forcément sur le bouton, donc dans le panneau. Sans cette levée, le gel
      // au survol/focus bloquait l'avance jusqu'à ce que la souris sorte du panneau.
      // Le gel se réarme à la prochaine entrée du pointeur ou au prochain focus.
      setIsHovered(false);
      setIsFocusWithin(false);
    } else {
      onUserPausedChange(true);
    }
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse") setIsHovered(true);
  };
  const handlePointerLeave = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse") setIsHovered(false);
  };
  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    setIsFocusWithin(isKeyboardFocus(e.target));
  };
  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsFocusWithin(false);
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
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...gestureHandlers}
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

        {hasSubscreens && (
          <div className="presentation-progress-row">
            <PresentationProgressSegments
              count={count}
              activeIndex={activeIndex}
              progressRatio={progressRatio}
              onSelect={(i) => navigateManually({ type: "goto", index: i })}
              label={ecranLabel}
            />
            {canAutoAdvance && (
              <PresentationPlayPauseButton
                isPaused={isUserPaused || isSuspended}
                onToggle={handleTogglePlay}
                lang={lang}
              />
            )}
            <PresentationSubscreenNav
              count={count}
              canPrev={hasPrev}
              canNext={hasNext}
              onPrev={() => navigateManually({ type: "prev" })}
              onNext={() => navigateManually({ type: "next" })}
              prevLabel={lang === "fr" ? "Écran précédent" : "Previous screen"}
              nextLabel={lang === "fr" ? "Écran suivant" : "Next screen"}
            />
          </div>
        )}

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
        onClick={onNextPanel}
        label={lang === "fr" ? "Chapitre suivant" : "Next chapter"}
      />

      <p className="sr-only" aria-live="polite" data-testid="presentation-subscreen-announcer">
        {announcement}
      </p>
    </section>
  );
}
