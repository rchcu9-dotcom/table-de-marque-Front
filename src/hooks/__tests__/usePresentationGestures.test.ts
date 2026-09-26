import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type React from "react";
import {
  usePresentationGestures,
  type UsePresentationGesturesOptions,
} from "../usePresentationGestures";

// Panneau de 300 px de large à partir de x = 0 : tiers gauche = [0, 100[.
const panel = document.createElement("section");
panel.getBoundingClientRect = () =>
  ({ left: 0, top: 0, width: 300, height: 600, right: 300, bottom: 600, x: 0, y: 0 }) as DOMRect;

type PointerInit = {
  x: number;
  y?: number;
  pointerId?: number;
  pointerType?: string;
  target?: EventTarget;
};

function pointer({ x, y = 300, pointerId = 1, pointerType = "touch", target = panel }: PointerInit) {
  return {
    clientX: x,
    clientY: y,
    pointerId,
    pointerType,
    target,
    currentTarget: panel,
  } as unknown as React.PointerEvent<HTMLElement>;
}

function setup(overrides: Pick<Partial<UsePresentationGesturesOptions>, "enabled"> = {}) {
  const options = {
    enabled: true,
    onPrev: vi.fn<() => void>(),
    onNext: vi.fn<() => void>(),
    onHoldChange: vi.fn<(isHeld: boolean) => void>(),
    ...overrides,
  };
  const { result, unmount } = renderHook(() => usePresentationGestures(options));
  return { ...options, handlers: () => result.current, unmount };
}

let now = 0;

beforeEach(() => {
  vi.useFakeTimers();
  now = 0;
  vi.spyOn(Date, "now").mockImplementation(() => now);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function tap(h: ReturnType<ReturnType<typeof setup>["handlers"]>, x: number, durationMs = 100) {
  act(() => h.onPointerDown(pointer({ x })));
  now += durationMs;
  act(() => {
    vi.advanceTimersByTime(durationMs);
  });
  act(() => h.onPointerUp(pointer({ x })));
}

describe("usePresentationGestures", () => {
  it("a tap in the right two thirds calls onNext", () => {
    const { handlers, onNext, onPrev } = setup();
    tap(handlers(), 200);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).not.toHaveBeenCalled();
  });

  it("a tap in the left third calls onPrev", () => {
    const { handlers, onNext, onPrev } = setup();
    tap(handlers(), 50);
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });

  it("a swipe to the left calls onNext, a swipe to the right calls onPrev", () => {
    const { handlers, onNext, onPrev } = setup();
    const h = handlers();

    act(() => h.onPointerDown(pointer({ x: 200 })));
    act(() => h.onPointerMove(pointer({ x: 150 })));
    now += 150;
    act(() => h.onPointerUp(pointer({ x: 120, y: 310 })));
    expect(onNext).toHaveBeenCalledTimes(1);

    act(() => h.onPointerDown(pointer({ x: 100 })));
    now += 150;
    act(() => h.onPointerUp(pointer({ x: 180, y: 290 })));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("ignores a vertical-dominant gesture", () => {
    const { handlers, onNext, onPrev } = setup();
    const h = handlers();

    act(() => h.onPointerDown(pointer({ x: 200, y: 400 })));
    now += 150;
    act(() => h.onPointerUp(pointer({ x: 210, y: 200 })));

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrev).not.toHaveBeenCalled();
  });

  it("abandons the gesture on pointercancel (le navigateur prend le scroll vertical)", () => {
    const { handlers, onNext, onPrev } = setup();
    const h = handlers();

    act(() => h.onPointerDown(pointer({ x: 200 })));
    act(() => h.onPointerCancel(pointer({ x: 200 })));
    act(() => h.onPointerUp(pointer({ x: 200 })));

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrev).not.toHaveBeenCalled();
  });

  describe("appui long", () => {
    it("calls onHoldChange(true) after 500 ms, then onHoldChange(false) on release, without navigating", () => {
      const { handlers, onHoldChange, onNext, onPrev } = setup();
      const h = handlers();

      act(() => h.onPointerDown(pointer({ x: 200 })));
      act(() => {
        vi.advanceTimersByTime(499);
      });
      expect(onHoldChange).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(onHoldChange).toHaveBeenLastCalledWith(true);

      now += 1500;
      act(() => h.onPointerUp(pointer({ x: 200 })));
      expect(onHoldChange).toHaveBeenLastCalledWith(false);
      expect(onHoldChange).toHaveBeenCalledTimes(2);
      expect(onNext).not.toHaveBeenCalled();
      expect(onPrev).not.toHaveBeenCalled();
    });

    it("releases the hold on pointercancel too", () => {
      const { handlers, onHoldChange } = setup();
      const h = handlers();

      act(() => h.onPointerDown(pointer({ x: 200 })));
      act(() => {
        vi.advanceTimersByTime(600);
      });
      act(() => h.onPointerCancel(pointer({ x: 200 })));

      expect(onHoldChange.mock.calls).toEqual([[true], [false]]);
    });

    it("is not triggered when the finger moved 10 px or more before 500 ms", () => {
      const { handlers, onHoldChange } = setup();
      const h = handlers();

      act(() => h.onPointerDown(pointer({ x: 200 })));
      act(() => h.onPointerMove(pointer({ x: 212 })));
      act(() => {
        vi.advanceTimersByTime(800);
      });

      expect(onHoldChange).not.toHaveBeenCalled();
    });

    it("tolerates small jitter below 10 px", () => {
      const { handlers, onHoldChange } = setup();
      const h = handlers();

      act(() => h.onPointerDown(pointer({ x: 200 })));
      act(() => h.onPointerMove(pointer({ x: 204, y: 303 })));
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onHoldChange).toHaveBeenCalledWith(true);
    });

    it("does not call onHoldChange(false) on release when no hold happened", () => {
      const { handlers, onHoldChange } = setup();
      tap(handlers(), 200);
      expect(onHoldChange).not.toHaveBeenCalled();
    });
  });

  describe("filtrage", () => {
    it("ignores mouse and pen pointers", () => {
      const { handlers, onNext, onHoldChange } = setup();
      const h = handlers();

      for (const pointerType of ["mouse", "pen"]) {
        act(() => h.onPointerDown(pointer({ x: 200, pointerType })));
        act(() => {
          vi.advanceTimersByTime(600);
        });
        act(() => h.onPointerUp(pointer({ x: 200, pointerType })));
      }

      expect(onNext).not.toHaveBeenCalled();
      expect(onHoldChange).not.toHaveBeenCalled();
    });

    it.each(["a", "button", "input"])(
      "ignores gestures starting on an interactive element (<%s>)",
      (tag) => {
        const { handlers, onNext, onHoldChange } = setup();
        const h = handlers();
        const target = document.createElement(tag);

        act(() => h.onPointerDown(pointer({ x: 200, target })));
        act(() => {
          vi.advanceTimersByTime(600);
        });
        act(() => h.onPointerUp(pointer({ x: 200, target })));

        expect(onNext).not.toHaveBeenCalled();
        expect(onHoldChange).not.toHaveBeenCalled();
      },
    );

    it("ignores gestures starting on a progress segment (role=tab)", () => {
      const { handlers, onNext } = setup();
      const target = document.createElement("div");
      target.setAttribute("role", "tab");

      act(() => handlers().onPointerDown(pointer({ x: 200, target })));
      act(() => handlers().onPointerUp(pointer({ x: 200, target })));

      expect(onNext).not.toHaveBeenCalled();
    });

    it("does nothing when disabled (chapitre à 0 ou 1 sous-écran)", () => {
      const { handlers, onNext, onPrev, onHoldChange } = setup({ enabled: false });
      tap(handlers(), 200);
      tap(handlers(), 50, 800);

      expect(onNext).not.toHaveBeenCalled();
      expect(onPrev).not.toHaveBeenCalled();
      expect(onHoldChange).not.toHaveBeenCalled();
    });

    it("keeps tracking the first finger only (multi-touch)", () => {
      const { handlers, onNext, onPrev } = setup();
      const h = handlers();

      act(() => h.onPointerDown(pointer({ x: 200, pointerId: 1 })));
      act(() => h.onPointerDown(pointer({ x: 50, pointerId: 2 })));
      now += 100;
      act(() => h.onPointerUp(pointer({ x: 50, pointerId: 2 })));
      expect(onPrev).not.toHaveBeenCalled();
      expect(onNext).not.toHaveBeenCalled();

      act(() => h.onPointerUp(pointer({ x: 200, pointerId: 1 })));
      expect(onNext).toHaveBeenCalledTimes(1);
      expect(onPrev).not.toHaveBeenCalled();
    });
  });

  it("clears the pending hold timer on unmount", () => {
    const { handlers, onHoldChange, unmount } = setup();

    act(() => handlers().onPointerDown(pointer({ x: 200 })));
    unmount();
    vi.advanceTimersByTime(1000);

    expect(onHoldChange).not.toHaveBeenCalled();
  });
});
