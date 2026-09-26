import { useEffect, useReducer, useRef, useState } from "react";
import type { PresentationGroupe } from "../api/presentation";
import {
  canNext as canNextIndex,
  canPrev as canPrevIndex,
  getAutoAdvanceMode,
  initialSubscreenState,
  subscreenReducer,
} from "../utils/presentationSubscreenNav";

export type UsePresentationAutoAdvanceOptions = {
  /** Chapitre hors écran (nom conservé pour limiter la casse). */
  isPaused: boolean;
  /** Gel temporaire : survol, focus ou appui long. La progression est conservée. */
  isHoldPaused?: boolean;
  /** Pause explicite globale (bouton pause/lecture). La progression est conservée. */
  isUserPaused?: boolean;
};

export type UsePresentationAutoAdvanceResult = {
  activeIndex: number;
  progressRatio: number;
  /** count > 1 et pas de prefers-reduced-motion : le bouton pause a un sens. */
  canAutoAdvance: boolean;
  canPrev: boolean;
  canNext: boolean;
  isSuspended: boolean;
  /** Navigation manuelle (segments) : pose la suspension. */
  goTo: (index: number) => void;
  /** Navigation manuelle bornée : pose la suspension. */
  prev: () => void;
  /** Navigation manuelle bornée (ne boucle pas) : pose la suspension. */
  next: () => void;
  /** Lève la suspension après action manuelle. */
  resume: () => void;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * Réimplémente setupChapter() de la maquette en React : cycle des
 * sous-écrans toutes les groupe.dureeMs (en boucle), selon trois régimes
 * (voir getAutoAdvanceMode) :
 * - running : l'avance tourne, en repartant du temps déjà écoulé ;
 * - frozen : survol, focus, appui long ou pause explicite, la barre reste figée ;
 * - stopped : hors écran, suspension manuelle, count <= 1 ou prefers-reduced-motion,
 *   la barre revient à 0.
 * La navigation manuelle est bornée et suspend l'avance jusqu'à ce que le
 * chapitre sorte de l'écran.
 */
export function usePresentationAutoAdvance(
  groupe: PresentationGroupe,
  options: UsePresentationAutoAdvanceOptions,
): UsePresentationAutoAdvanceResult {
  const count = groupe.articles.length;
  const [state, dispatch] = useReducer(subscreenReducer, initialSubscreenState);
  const [progressRatio, setProgressRatio] = useState(0);
  const elapsedRef = useRef(0);
  const lastResetKeyRef = useRef(state.resetKey);
  const wasPausedRef = useRef(options.isPaused);

  const reducedMotion = prefersReducedMotion();
  const mode = getAutoAdvanceMode({
    isPaused: options.isPaused,
    count,
    reducedMotion,
    isSuspended: state.isSuspended,
    isHoldPaused: options.isHoldPaused ?? false,
    isUserPaused: options.isUserPaused ?? false,
  });

  // Nouveau chapitre (changement de groupe.nom) : repartir du premier sous-écran.
  useEffect(() => {
    dispatch({ type: "reset" });
  }, [groupe.nom]);

  // Front montant de isPaused (le chapitre sort de l'écran) : lève la suspension (D6).
  useEffect(() => {
    if (options.isPaused && !wasPausedRef.current) {
      dispatch({ type: "chapter-left" });
    }
    wasPausedRef.current = options.isPaused;
  }, [options.isPaused]);

  useEffect(() => {
    if (lastResetKeyRef.current !== state.resetKey) {
      lastResetKeyRef.current = state.resetKey;
      elapsedRef.current = 0;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- un changement d'écran repart d'une barre vide
      setProgressRatio(0);
    }

    if (mode === "stopped") {
      elapsedRef.current = 0;
      setProgressRatio(0);
      return;
    }
    if (mode === "frozen") return;

    const start = Date.now() - elapsedRef.current;
    let raf: number;

    const tick = () => {
      const elapsed = Date.now() - start;
      elapsedRef.current = elapsed;
      const ratio = Math.min(elapsed / groupe.dureeMs, 1);
      setProgressRatio(ratio);
      if (ratio >= 1) {
        elapsedRef.current = 0;
        setProgressRatio(0);
        dispatch({ type: "auto-advance", count });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [mode, count, groupe.dureeMs, state.resetKey]);

  return {
    activeIndex: state.activeIndex,
    progressRatio,
    canAutoAdvance: count > 1 && !reducedMotion,
    canPrev: canPrevIndex(state.activeIndex),
    canNext: canNextIndex(state.activeIndex, count),
    isSuspended: state.isSuspended,
    goTo: (index: number) => dispatch({ type: "manual-goto", index, count }),
    prev: () => dispatch({ type: "manual-prev" }),
    next: () => dispatch({ type: "manual-next", count }),
    resume: () => dispatch({ type: "resume" }),
  };
}
