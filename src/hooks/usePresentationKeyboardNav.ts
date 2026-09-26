import { useEffect, useRef } from "react";

const TEXT_INPUT_SELECTOR = 'input,textarea,select,[contenteditable]:not([contenteditable="false"])';

/**
 * Filtre pur des touches de navigation entre sous-écrans : ←/→ sans modificateur,
 * hors champ de saisie et hors événement déjà traité. ↓, PageDown et Espace ne
 * sont jamais interceptées (scroll natif entre chapitres).
 */
export function shouldHandleSubscreenKey(
  e: Pick<
    KeyboardEvent,
    "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "defaultPrevented" | "target"
  >,
): "prev" | "next" | null {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return null;
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented) return null;
  const target = e.target as Element | null;
  if (target && typeof target.closest === "function" && target.closest(TEXT_INPUT_SELECTOR)) {
    return null;
  }
  return e.key === "ArrowLeft" ? "prev" : "next";
}

/**
 * Un seul écouteur document à la fois : seul le chapitre actif (enabled) l'attache.
 * Les callbacks passent par un ref pour ne pas réabonner l'écouteur à chaque rendu.
 */
export function usePresentationKeyboardNav(options: {
  enabled: boolean;
  onPrev: () => void;
  onNext: () => void;
}): void {
  const callbacksRef = useRef(options);
  useEffect(() => {
    callbacksRef.current = options;
  });

  useEffect(() => {
    if (!options.enabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const direction = shouldHandleSubscreenKey(e);
      if (!direction) return;
      e.preventDefault();
      if (direction === "prev") callbacksRef.current.onPrev();
      else callbacksRef.current.onNext();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [options.enabled]);
}
