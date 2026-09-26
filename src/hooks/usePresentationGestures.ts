import { useEffect, useRef } from "react";
import type React from "react";
import {
  HOLD_MIN_DURATION_MS,
  TAP_MAX_MOVE_PX,
  classifyPointerGesture,
  isInteractiveTarget,
} from "../utils/presentationGestures";

type GestureState = {
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
  holdTimer: ReturnType<typeof setTimeout> | null;
  wasHold: boolean;
};

export type UsePresentationGesturesOptions = {
  /** false si le chapitre n'a pas plusieurs sous-écrans. */
  enabled: boolean;
  onPrev: () => void;
  onNext: () => void;
  onHoldChange: (isHeld: boolean) => void;
};

export type UsePresentationGesturesHandlers = {
  onPointerDown: React.PointerEventHandler<HTMLElement>;
  onPointerMove: React.PointerEventHandler<HTMLElement>;
  onPointerUp: React.PointerEventHandler<HTMLElement>;
  onPointerCancel: React.PointerEventHandler<HTMLElement>;
};

/**
 * Gestes tactiles d'un chapitre (tap, swipe horizontal, appui long), sur Pointer
 * Events filtrés à pointerType === "touch". Le panneau porte touch-action: pan-y :
 * quand le navigateur prend un scroll vertical il émet pointercancel, et le geste
 * est abandonné sans effet.
 */
export function usePresentationGestures(
  options: UsePresentationGesturesOptions,
): UsePresentationGesturesHandlers {
  const gestureRef = useRef<GestureState | null>(null);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const clear = () => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    if (gesture.holdTimer) clearTimeout(gesture.holdTimer);
    if (gesture.wasHold) optionsRef.current.onHoldChange(false);
    gestureRef.current = null;
  };

  useEffect(
    () => () => {
      const gesture = gestureRef.current;
      if (gesture?.holdTimer) clearTimeout(gesture.holdTimer);
      gestureRef.current = null;
    },
    [],
  );

  const onPointerDown: React.PointerEventHandler<HTMLElement> = (e) => {
    if (!optionsRef.current.enabled) return;
    if (e.pointerType !== "touch") return;
    if (gestureRef.current) return; // multi-touch : on garde le premier doigt
    if (isInteractiveTarget(e.target)) return;

    const gesture: GestureState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      holdTimer: null,
      wasHold: false,
    };
    gesture.holdTimer = setTimeout(() => {
      gesture.holdTimer = null;
      if (gestureRef.current !== gesture) return;
      gesture.wasHold = true;
      optionsRef.current.onHoldChange(true);
    }, HOLD_MIN_DURATION_MS);
    gestureRef.current = gesture;
  };

  const onPointerMove: React.PointerEventHandler<HTMLElement> = (e) => {
    const gesture = gestureRef.current;
    if (!gesture || e.pointerId !== gesture.pointerId || !gesture.holdTimer) return;
    const moved = Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY);
    if (moved >= TAP_MAX_MOVE_PX) {
      clearTimeout(gesture.holdTimer);
      gesture.holdTimer = null;
    }
  };

  const onPointerUp: React.PointerEventHandler<HTMLElement> = (e) => {
    const gesture = gestureRef.current;
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const result = classifyPointerGesture({
      dx: e.clientX - gesture.startX,
      dy: e.clientY - gesture.startY,
      durationMs: Date.now() - gesture.startTime,
      startX: gesture.startX,
      panelLeft: rect.left,
      panelWidth: rect.width,
      wasHold: gesture.wasHold,
    });
    clear();
    if (result === "prev") optionsRef.current.onPrev();
    else if (result === "next") optionsRef.current.onNext();
  };

  const onPointerCancel: React.PointerEventHandler<HTMLElement> = (e) => {
    const gesture = gestureRef.current;
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    clear();
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
