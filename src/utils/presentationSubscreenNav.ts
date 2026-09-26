/**
 * Logique pure de navigation entre sous-écrans d'un chapitre de la page
 * Présentation : bornes, suspension après action manuelle et régime de
 * l'avance automatique. Aucune dépendance React, testable sans RAF ni DOM.
 */

export type SubscreenState = {
  activeIndex: number;
  /** Incrémenté à chaque changement d'écran : la progression repart de 0 ms. */
  resetKey: number;
  /** Suspension de l'avance auto après une action manuelle, levée au changement de chapitre. */
  isSuspended: boolean;
};

export type SubscreenAction =
  | { type: "reset" }
  | { type: "auto-advance"; count: number }
  | { type: "manual-goto"; index: number; count: number }
  | { type: "manual-prev" }
  | { type: "manual-next"; count: number }
  | { type: "chapter-left" }
  | { type: "resume" };

export const initialSubscreenState: SubscreenState = {
  activeIndex: 0,
  resetKey: 0,
  isSuspended: false,
};

export function canPrev(activeIndex: number): boolean {
  return activeIndex > 0;
}

export function canNext(activeIndex: number, count: number): boolean {
  return activeIndex < count - 1;
}

/**
 * Action manuelle : pose toujours la suspension (l'utilisateur prend la main),
 * mais ne change d'écran que si la cible est différente de l'écran courant.
 */
function manualMove(state: SubscreenState, target: number): SubscreenState {
  if (target === state.activeIndex) {
    return state.isSuspended ? state : { ...state, isSuspended: true };
  }
  return { activeIndex: target, resetKey: state.resetKey + 1, isSuspended: true };
}

export function subscreenReducer(
  state: SubscreenState,
  action: SubscreenAction,
): SubscreenState {
  switch (action.type) {
    case "reset":
      return { activeIndex: 0, resetKey: state.resetKey + 1, isSuspended: false };
    case "auto-advance":
      // L'avance automatique seule garde le bouclage dernier → premier (D2).
      if (action.count <= 0) return state;
      return {
        ...state,
        activeIndex: (state.activeIndex + 1) % action.count,
        resetKey: state.resetKey + 1,
      };
    case "manual-goto":
      if (action.index < 0 || action.index >= action.count) return state;
      return manualMove(state, action.index);
    case "manual-prev":
      return manualMove(state, canPrev(state.activeIndex) ? state.activeIndex - 1 : state.activeIndex);
    case "manual-next":
      return manualMove(
        state,
        canNext(state.activeIndex, action.count) ? state.activeIndex + 1 : state.activeIndex,
      );
    case "chapter-left":
    case "resume":
      return state.isSuspended ? { ...state, isSuspended: false } : state;
    default:
      return state;
  }
}

export type AutoAdvanceMode = "running" | "frozen" | "stopped";

/**
 * - stopped : progression remise à 0 (hors écran, suspension manuelle, rien à faire défiler).
 * - frozen : progression figée, temps écoulé conservé (survol, focus, appui long, pause explicite).
 * - running : l'avance tourne.
 * Priorité : stopped > frozen > running.
 */
export function getAutoAdvanceMode(input: {
  isPaused: boolean;
  count: number;
  reducedMotion: boolean;
  isSuspended: boolean;
  isHoldPaused: boolean;
  isUserPaused: boolean;
}): AutoAdvanceMode {
  if (input.isPaused || input.count <= 1 || input.reducedMotion || input.isSuspended) {
    return "stopped";
  }
  if (input.isHoldPaused || input.isUserPaused) return "frozen";
  return "running";
}
