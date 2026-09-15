import { useEffect, useState } from "react";
import type { PresentationGroupe } from "../api/presentation";

export type UsePresentationAutoAdvanceResult = {
  activeIndex: number;
  progressRatio: number;
  goTo: (index: number) => void;
  next: () => void;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * Réimplémente setupChapter() de la maquette en React : cycle des
 * sous-écrans toutes les groupe.dureeMs, remise à zéro sur goTo/next,
 * gelé si isPaused (piloté par un IntersectionObserver côté PresentationChapter)
 * ou si prefers-reduced-motion (navigation manuelle seule, pas d'auto-avance).
 */
export function usePresentationAutoAdvance(
  groupe: PresentationGroupe,
  options: { isPaused: boolean },
): UsePresentationAutoAdvanceResult {
  const count = groupe.articles.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [progressRatio, setProgressRatio] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  // Nouveau chapitre (changement de groupe.nom) : repartir du premier sous-écran.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronise l'état de scroll interne avec le changement de chapitre reçu en prop
    setActiveIndex(0);
    setProgressRatio(0);
    setResetKey((k) => k + 1);
  }, [groupe.nom]);

  useEffect(() => {
    if (options.isPaused || count <= 1 || prefersReducedMotion()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- gèle immédiatement la barre de progression quand ce sous-abonnement RAF ne démarre pas
      setProgressRatio(0);
      return;
    }

    const start = Date.now();
    let raf: number;

    const tick = () => {
      const elapsed = Date.now() - start;
      const ratio = Math.min(elapsed / groupe.dureeMs, 1);
      setProgressRatio(ratio);
      if (ratio >= 1) {
        setActiveIndex((i) => (i + 1) % count);
        setResetKey((k) => k + 1);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [options.isPaused, count, groupe.dureeMs, resetKey]);

  const goTo = (index: number) => {
    if (index < 0 || index >= count) return;
    setActiveIndex(index);
    setProgressRatio(0);
    setResetKey((k) => k + 1);
  };

  const next = () => {
    if (count === 0) return;
    goTo((activeIndex + 1) % count);
  };

  return { activeIndex, progressRatio, goTo, next };
}
