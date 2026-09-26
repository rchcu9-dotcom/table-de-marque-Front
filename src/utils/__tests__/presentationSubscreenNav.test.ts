import { describe, it, expect } from "vitest";
import {
  canNext,
  canPrev,
  getAutoAdvanceMode,
  initialSubscreenState,
  subscreenReducer,
  type SubscreenState,
} from "../presentationSubscreenNav";

function state(overrides: Partial<SubscreenState> = {}): SubscreenState {
  return { ...initialSubscreenState, ...overrides };
}

describe("canPrev / canNext", () => {
  it("canPrev is false on the first subscreen only", () => {
    expect(canPrev(0)).toBe(false);
    expect(canPrev(1)).toBe(true);
    expect(canPrev(2)).toBe(true);
  });

  it("canNext is false on the last subscreen only", () => {
    expect(canNext(0, 3)).toBe(true);
    expect(canNext(1, 3)).toBe(true);
    expect(canNext(2, 3)).toBe(false);
  });

  it("canNext is false for chapters with 0 or 1 subscreen", () => {
    expect(canNext(0, 0)).toBe(false);
    expect(canNext(0, 1)).toBe(false);
  });
});

describe("subscreenReducer", () => {
  it("starts on the first subscreen, not suspended", () => {
    expect(initialSubscreenState).toEqual({ activeIndex: 0, resetKey: 0, isSuspended: false });
  });

  describe("auto-advance (D2 : l'avance automatique boucle)", () => {
    it("moves to the next subscreen and bumps resetKey, without suspending", () => {
      const next = subscreenReducer(state(), { type: "auto-advance", count: 3 });
      expect(next).toEqual({ activeIndex: 1, resetKey: 1, isSuspended: false });
    });

    it("wraps from the last subscreen back to the first", () => {
      const next = subscreenReducer(state({ activeIndex: 2, resetKey: 4 }), {
        type: "auto-advance",
        count: 3,
      });
      expect(next.activeIndex).toBe(0);
      expect(next.resetKey).toBe(5);
    });

    it("is a no-op when the chapter has no subscreen", () => {
      const s = state();
      expect(subscreenReducer(s, { type: "auto-advance", count: 0 })).toBe(s);
    });
  });

  describe("manual-next (borné)", () => {
    it("advances by one, bumps resetKey and suspends auto-advance", () => {
      const next = subscreenReducer(state(), { type: "manual-next", count: 3 });
      expect(next).toEqual({ activeIndex: 1, resetKey: 1, isSuspended: true });
    });

    it("does not wrap on the last subscreen but still suspends, without bumping resetKey", () => {
      const next = subscreenReducer(state({ activeIndex: 2, resetKey: 7 }), {
        type: "manual-next",
        count: 3,
      });
      expect(next).toEqual({ activeIndex: 2, resetKey: 7, isSuspended: true });
    });

    it("returns the same state object when already suspended at the bound", () => {
      const s = state({ activeIndex: 1, isSuspended: true });
      expect(subscreenReducer(s, { type: "manual-next", count: 2 })).toBe(s);
    });
  });

  describe("manual-prev (borné)", () => {
    it("goes back by one, bumps resetKey and suspends auto-advance", () => {
      const next = subscreenReducer(state({ activeIndex: 2, resetKey: 3 }), { type: "manual-prev" });
      expect(next).toEqual({ activeIndex: 1, resetKey: 4, isSuspended: true });
    });

    it("does not wrap on the first subscreen but still suspends", () => {
      const next = subscreenReducer(state(), { type: "manual-prev" });
      expect(next).toEqual({ activeIndex: 0, resetKey: 0, isSuspended: true });
    });
  });

  describe("manual-goto (clic sur un segment)", () => {
    it("jumps to the requested subscreen and suspends", () => {
      const next = subscreenReducer(state(), { type: "manual-goto", index: 2, count: 3 });
      expect(next).toEqual({ activeIndex: 2, resetKey: 1, isSuspended: true });
    });

    it("suspends without changing screen when targeting the current subscreen", () => {
      const next = subscreenReducer(state({ activeIndex: 1, resetKey: 2 }), {
        type: "manual-goto",
        index: 1,
        count: 3,
      });
      expect(next).toEqual({ activeIndex: 1, resetKey: 2, isSuspended: true });
    });

    it.each([-1, 3, 10])("ignores the out-of-range index %i entirely (no suspension)", (index) => {
      const s = state();
      expect(subscreenReducer(s, { type: "manual-goto", index, count: 3 })).toBe(s);
    });
  });

  describe("levée de la suspension", () => {
    it("chapter-left lifts the suspension without changing the subscreen (D6)", () => {
      const next = subscreenReducer(state({ activeIndex: 2, resetKey: 5, isSuspended: true }), {
        type: "chapter-left",
      });
      expect(next).toEqual({ activeIndex: 2, resetKey: 5, isSuspended: false });
    });

    it("resume lifts the suspension without changing the subscreen", () => {
      const next = subscreenReducer(state({ activeIndex: 1, isSuspended: true }), { type: "resume" });
      expect(next).toEqual({ activeIndex: 1, resetKey: 0, isSuspended: false });
    });

    it("chapter-left and resume are no-ops (same object) when not suspended", () => {
      const s = state({ activeIndex: 1 });
      expect(subscreenReducer(s, { type: "chapter-left" })).toBe(s);
      expect(subscreenReducer(s, { type: "resume" })).toBe(s);
    });
  });

  it("reset goes back to the first subscreen, bumps resetKey and lifts the suspension", () => {
    const next = subscreenReducer(state({ activeIndex: 2, resetKey: 9, isSuspended: true }), {
      type: "reset",
    });
    expect(next).toEqual({ activeIndex: 0, resetKey: 10, isSuspended: false });
  });

  it("returns the state unchanged for an unknown action", () => {
    const s = state();
    // @ts-expect-error action inconnue volontaire
    expect(subscreenReducer(s, { type: "unknown" })).toBe(s);
  });
});

describe("getAutoAdvanceMode", () => {
  const base = {
    isPaused: false,
    count: 3,
    reducedMotion: false,
    isSuspended: false,
    isHoldPaused: false,
    isUserPaused: false,
  };

  it("is running when nothing pauses it", () => {
    expect(getAutoAdvanceMode(base)).toBe("running");
  });

  it.each([
    ["chapitre hors écran", { isPaused: true }],
    ["un seul sous-écran", { count: 1 }],
    ["aucun sous-écran", { count: 0 }],
    ["prefers-reduced-motion", { reducedMotion: true }],
    ["suspension après action manuelle", { isSuspended: true }],
  ])("is stopped (progression remise à 0) : %s", (_label, overrides) => {
    expect(getAutoAdvanceMode({ ...base, ...overrides })).toBe("stopped");
  });

  it.each([
    ["survol / focus / appui long", { isHoldPaused: true }],
    ["pause explicite globale", { isUserPaused: true }],
  ])("is frozen (progression conservée) : %s", (_label, overrides) => {
    expect(getAutoAdvanceMode({ ...base, ...overrides })).toBe("frozen");
  });

  it("gives priority to stopped over frozen", () => {
    expect(
      getAutoAdvanceMode({ ...base, isSuspended: true, isHoldPaused: true, isUserPaused: true }),
    ).toBe("stopped");
    expect(getAutoAdvanceMode({ ...base, isPaused: true, isUserPaused: true })).toBe("stopped");
  });
});
