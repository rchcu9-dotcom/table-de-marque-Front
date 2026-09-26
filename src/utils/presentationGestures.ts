/**
 * Classification pure des gestes tactiles de la page Présentation
 * (tap, swipe horizontal). L'appui long est détecté par le hook via un minuteur.
 */

export const TAP_MAX_MOVE_PX = 10;
export const TAP_MAX_DURATION_MS = 500;
export const HOLD_MIN_DURATION_MS = 500;
export const SWIPE_MIN_DX_PX = 40;
export const SWIPE_DIRECTION_RATIO = 1.5;
export const INTERACTIVE_SELECTOR =
  'a,button,input,select,textarea,[role="tab"],[role="button"],[contenteditable]';

export type GestureResult = "prev" | "next" | "none";

export function classifyPointerGesture(input: {
  dx: number;
  dy: number;
  durationMs: number;
  startX: number;
  panelLeft: number;
  panelWidth: number;
  wasHold: boolean;
}): GestureResult {
  if (input.wasHold) return "none";

  const absDx = Math.abs(input.dx);
  const absDy = Math.abs(input.dy);

  if (absDx >= SWIPE_MIN_DX_PX && absDx > SWIPE_DIRECTION_RATIO * absDy) {
    return input.dx < 0 ? "next" : "prev";
  }

  if (Math.hypot(input.dx, input.dy) < TAP_MAX_MOVE_PX && input.durationMs < TAP_MAX_DURATION_MS) {
    // Convention Stories : tiers gauche = précédent, deux tiers droits = suivant.
    return input.startX < input.panelLeft + input.panelWidth / 3 ? "prev" : "next";
  }

  return "none";
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  return (target as Element).closest(INTERACTIVE_SELECTOR) !== null;
}
