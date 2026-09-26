import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePresentationAutoAdvance } from "../usePresentationAutoAdvance";
import type { ArticlePresentation, PresentationGroupe } from "../../api/presentation";

function makeArticle(titre: string): ArticlePresentation {
  return {
    groupe: "Présentation",
    groupeEn: "Presentation",
    titre,
    titreEn: titre,
    description: "",
    descriptionEn: "",
    surtitre: "",
    surtitreEn: "",
    faits: "",
    faitsEn: "",
    titreAccroche: "", titreAccrocheEn: "", descriptionCourte: "", descriptionCourteEn: "",
    imageUrl: null,
    lienUrl: null,
    lieu: null,
    mapsQuery: null,
  };
}

function makeGroupe(overrides: Partial<PresentationGroupe> = {}): PresentationGroupe {
  return {
    nom: "Présentation",
    nomEn: "Presentation",
    ordre: 0,
    dureeMs: 1000,
    imageUrl: null,
    articles: [makeArticle("A"), makeArticle("B")],
    ...overrides,
  };
}

// A real cancelAnimationFrame must actually drop the pending callback (React
// calls it from the effect cleanup when a dependency changes before the frame
// fires) — a no-op mock would let a stale "tick" fire on top of the fresh one
// and silently cancel out the transition being tested.
let rafCallbacks = new Map<number, FrameRequestCallback>();
let rafId = 0;
let now = 0;

function flushRaf() {
  const pending = Array.from(rafCallbacks.values());
  rafCallbacks.clear();
  pending.forEach((cb) => cb(now));
}

beforeEach(() => {
  rafCallbacks = new Map();
  rafId = 0;
  now = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    const id = ++rafId;
    rafCallbacks.set(id, cb);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    rafCallbacks.delete(id);
  });
  vi.spyOn(Date, "now").mockImplementation(() => now);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("usePresentationAutoAdvance", () => {
  it("starts at the first subtheme with progressRatio at 0", () => {
    const { result } = renderHook(() =>
      usePresentationAutoAdvance(makeGroupe(), { isPaused: false }),
    );

    expect(result.current.activeIndex).toBe(0);
    expect(result.current.progressRatio).toBe(0);
  });

  it("advances progressRatio as time passes, without changing the active index yet", () => {
    const { result } = renderHook(() =>
      usePresentationAutoAdvance(makeGroupe({ dureeMs: 1000 }), { isPaused: false }),
    );

    now = 500;
    act(() => flushRaf());

    expect(result.current.progressRatio).toBeCloseTo(0.5);
    expect(result.current.activeIndex).toBe(0);
  });

  it("moves to the next subtheme once dureeMs has fully elapsed, then restarts progress from 0", () => {
    const { result } = renderHook(() =>
      usePresentationAutoAdvance(makeGroupe({ dureeMs: 1000 }), { isPaused: false }),
    );

    now = 1000;
    act(() => flushRaf());
    expect(result.current.activeIndex).toBe(1);

    // The transition schedules a fresh RAF loop for the new subtheme; flushing
    // it reports elapsed 0 from the new start, i.e. progress restarts at 0.
    act(() => flushRaf());
    expect(result.current.progressRatio).toBe(0);
  });

  it("wraps back to the first subtheme after the last one elapses", () => {
    const { result } = renderHook(() =>
      usePresentationAutoAdvance(makeGroupe({ dureeMs: 1000 }), { isPaused: false }),
    );

    now = 1000;
    act(() => flushRaf()); // -> index 1
    now = 2000;
    act(() => flushRaf()); // second subtheme elapses -> wraps to 0

    expect(result.current.activeIndex).toBe(0);
  });

  it("does not schedule any animation frame and pins progressRatio at 0 while paused", () => {
    const { result } = renderHook(() =>
      usePresentationAutoAdvance(makeGroupe(), { isPaused: true }),
    );

    expect(rafCallbacks.size).toBe(0);
    expect(result.current.progressRatio).toBe(0);
  });

  it("does not auto-advance when the chapter has a single subtheme", () => {
    const single = makeGroupe({ articles: [makeArticle("A")] });
    renderHook(() => usePresentationAutoAdvance(single, { isPaused: false }));

    expect(rafCallbacks.size).toBe(0);
  });

  it("does not crash and next() is a no-op when the chapter has zero subthemes", () => {
    const empty = makeGroupe({ articles: [] });
    const { result } = renderHook(() => usePresentationAutoAdvance(empty, { isPaused: false }));

    expect(result.current.activeIndex).toBe(0);
    act(() => result.current.next());
    expect(result.current.activeIndex).toBe(0);
  });

  it("freezes auto-advance under prefers-reduced-motion, but manual goTo still works", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true }),
    );
    const { result } = renderHook(() =>
      usePresentationAutoAdvance(makeGroupe(), { isPaused: false }),
    );

    expect(rafCallbacks.size).toBe(0);

    act(() => result.current.goTo(1));
    expect(result.current.activeIndex).toBe(1);
  });

  it("ignores goTo calls with an out-of-range index", () => {
    const { result } = renderHook(() =>
      usePresentationAutoAdvance(makeGroupe(), { isPaused: true }),
    );

    act(() => result.current.goTo(5));
    expect(result.current.activeIndex).toBe(0);

    act(() => result.current.goTo(-1));
    expect(result.current.activeIndex).toBe(0);
  });

  it("manual next() is bounded: it does not wrap after the last subtheme (D2)", () => {
    const { result } = renderHook(() =>
      usePresentationAutoAdvance(makeGroupe(), { isPaused: true }),
    );

    act(() => result.current.goTo(1));
    act(() => result.current.next());

    expect(result.current.activeIndex).toBe(1);
  });

  it("resets to the first subtheme when the chapter (groupe.nom) changes", () => {
    const groupeA = makeGroupe({ nom: "A" });
    const { result, rerender } = renderHook(
      ({ groupe }) => usePresentationAutoAdvance(groupe, { isPaused: true }),
      { initialProps: { groupe: groupeA } },
    );

    act(() => result.current.goTo(1));
    expect(result.current.activeIndex).toBe(1);

    const groupeB = makeGroupe({ nom: "B" });
    rerender({ groupe: groupeB });

    expect(result.current.activeIndex).toBe(0);
  });

  describe("navigation manuelle bornée", () => {
    const three = () =>
      makeGroupe({ articles: [makeArticle("A"), makeArticle("B"), makeArticle("C")] });

    it("exposes canPrev / canNext according to the bounds", () => {
      const { result } = renderHook(() => usePresentationAutoAdvance(three(), { isPaused: true }));

      expect(result.current.canPrev).toBe(false);
      expect(result.current.canNext).toBe(true);

      act(() => result.current.next());
      expect(result.current.canPrev).toBe(true);
      expect(result.current.canNext).toBe(true);

      act(() => result.current.next());
      expect(result.current.activeIndex).toBe(2);
      expect(result.current.canPrev).toBe(true);
      expect(result.current.canNext).toBe(false);
    });

    it("prev() goes back one subtheme and is a no-op on the first one", () => {
      const { result } = renderHook(() => usePresentationAutoAdvance(three(), { isPaused: true }));

      act(() => result.current.prev());
      expect(result.current.activeIndex).toBe(0);

      act(() => result.current.goTo(2));
      act(() => result.current.prev());
      expect(result.current.activeIndex).toBe(1);
    });

    it("exposes canAutoAdvance only when count > 1 and motion is allowed", () => {
      const multi = renderHook(() => usePresentationAutoAdvance(makeGroupe(), { isPaused: true }));
      expect(multi.result.current.canAutoAdvance).toBe(true);

      const single = renderHook(() =>
        usePresentationAutoAdvance(makeGroupe({ articles: [makeArticle("A")] }), { isPaused: true }),
      );
      expect(single.result.current.canAutoAdvance).toBe(false);

      vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
      const reduced = renderHook(() => usePresentationAutoAdvance(makeGroupe(), { isPaused: true }));
      expect(reduced.result.current.canAutoAdvance).toBe(false);
    });
  });

  describe("suspension après action manuelle (CA15)", () => {
    type Api = ReturnType<typeof usePresentationAutoAdvance>;
    it.each<[string, (api: Api) => void]>([
      ["next()", (api) => api.next()],
      ["prev()", (api) => api.prev()],
      ["goTo()", (api) => api.goTo(1)],
    ])("%s suspends the auto-advance and resets progress to 0", (_label, action) => {
      const { result } = renderHook(() =>
        usePresentationAutoAdvance(makeGroupe({ dureeMs: 1000 }), { isPaused: false }),
      );

      now = 400;
      act(() => flushRaf());
      expect(result.current.progressRatio).toBeCloseTo(0.4);

      act(() => action(result.current));

      expect(result.current.isSuspended).toBe(true);
      expect(result.current.progressRatio).toBe(0);
      expect(rafCallbacks.size).toBe(0);

      // Le temps passe, rien ne bouge tant que le chapitre reste à l'écran.
      now = 5000;
      act(() => flushRaf());
      expect(result.current.progressRatio).toBe(0);
    });

    it("lifts the suspension when the chapter leaves the screen, and restarts from the current subtheme on return (D6)", () => {
      const three = makeGroupe({
        dureeMs: 1000,
        articles: [makeArticle("A"), makeArticle("B"), makeArticle("C")],
      });
      const { result, rerender } = renderHook(
        ({ isPaused }) => usePresentationAutoAdvance(three, { isPaused }),
        { initialProps: { isPaused: false } },
      );

      act(() => result.current.next());
      expect(result.current.activeIndex).toBe(1);
      expect(result.current.isSuspended).toBe(true);

      rerender({ isPaused: true });
      expect(result.current.isSuspended).toBe(false);
      expect(result.current.activeIndex).toBe(1);
      expect(rafCallbacks.size).toBe(0);

      now = 10_000;
      rerender({ isPaused: false });
      now = 10_500;
      act(() => flushRaf());
      expect(result.current.progressRatio).toBeCloseTo(0.5);
      expect(result.current.activeIndex).toBe(1);

      now = 11_000;
      act(() => flushRaf());
      expect(result.current.activeIndex).toBe(2);
    });

    it("resume() lifts the suspension and restarts the auto-advance from 0", () => {
      const { result } = renderHook(() =>
        usePresentationAutoAdvance(makeGroupe({ dureeMs: 1000 }), { isPaused: false }),
      );

      act(() => result.current.goTo(1));
      expect(result.current.isSuspended).toBe(true);

      now = 3000;
      act(() => result.current.resume());
      expect(result.current.isSuspended).toBe(false);

      now = 3250;
      act(() => flushRaf());
      expect(result.current.progressRatio).toBeCloseTo(0.25);
    });

    it("a manual action on a bound still suspends the auto-advance", () => {
      const { result } = renderHook(() =>
        usePresentationAutoAdvance(makeGroupe(), { isPaused: false }),
      );

      act(() => result.current.prev());

      expect(result.current.activeIndex).toBe(0);
      expect(result.current.isSuspended).toBe(true);
    });

    it("the automatic advance itself never suspends", () => {
      const { result } = renderHook(() =>
        usePresentationAutoAdvance(makeGroupe({ dureeMs: 1000 }), { isPaused: false }),
      );

      now = 1000;
      act(() => flushRaf());

      expect(result.current.activeIndex).toBe(1);
      expect(result.current.isSuspended).toBe(false);
    });
  });

  describe("gel sans remise à zéro (CA10, CA14, D5)", () => {
    it("isHoldPaused freezes the progress bar at its current value, then resumes from there", () => {
      const groupe = makeGroupe({ dureeMs: 1000 });
      const { result, rerender } = renderHook(
        ({ isHoldPaused }) => usePresentationAutoAdvance(groupe, { isPaused: false, isHoldPaused }),
        { initialProps: { isHoldPaused: false } },
      );

      now = 300;
      act(() => flushRaf());
      expect(result.current.progressRatio).toBeCloseTo(0.3);

      rerender({ isHoldPaused: true });
      expect(rafCallbacks.size).toBe(0);
      expect(result.current.progressRatio).toBeCloseTo(0.3);

      // 5 s de gel : la progression reste figée.
      now = 5300;
      act(() => flushRaf());
      expect(result.current.progressRatio).toBeCloseTo(0.3);
      expect(result.current.activeIndex).toBe(0);

      rerender({ isHoldPaused: false });
      now = 5500;
      act(() => flushRaf());
      // Repart de 300 ms écoulés : 300 + 200 = 500 ms.
      expect(result.current.progressRatio).toBeCloseTo(0.5);

      now = 6000;
      act(() => flushRaf());
      expect(result.current.activeIndex).toBe(1);
    });

    it("isHoldPaused does not suspend (no manual action)", () => {
      const { result } = renderHook(() =>
        usePresentationAutoAdvance(makeGroupe(), { isPaused: false, isHoldPaused: true }),
      );
      expect(result.current.isSuspended).toBe(false);
      expect(rafCallbacks.size).toBe(0);
    });
  });

  describe("pause explicite globale (CA16, A2)", () => {
    it("isUserPaused freezes the progress (like hold) and resumes from the elapsed time", () => {
      const groupe = makeGroupe({ dureeMs: 1000 });
      const { result, rerender } = renderHook(
        ({ isUserPaused }) => usePresentationAutoAdvance(groupe, { isPaused: false, isUserPaused }),
        { initialProps: { isUserPaused: false } },
      );

      now = 600;
      act(() => flushRaf());
      rerender({ isUserPaused: true });
      expect(rafCallbacks.size).toBe(0);

      now = 60_000;
      act(() => flushRaf());
      expect(result.current.progressRatio).toBeCloseTo(0.6);
      expect(result.current.activeIndex).toBe(0);

      rerender({ isUserPaused: false });
      now = 60_400;
      act(() => flushRaf());
      expect(result.current.activeIndex).toBe(1);
    });

    it("leaving the screen resets the progress even while user-paused (stopped > frozen)", () => {
      const groupe = makeGroupe({ dureeMs: 1000 });
      const { result, rerender } = renderHook(
        ({ isPaused, isUserPaused }) =>
          usePresentationAutoAdvance(groupe, { isPaused, isUserPaused }),
        { initialProps: { isPaused: false, isUserPaused: false } },
      );

      now = 700;
      act(() => flushRaf());
      rerender({ isPaused: false, isUserPaused: true });
      expect(result.current.progressRatio).toBeCloseTo(0.7);

      rerender({ isPaused: true, isUserPaused: true });
      expect(result.current.progressRatio).toBe(0);
    });
  });

  it("resets the progress to 0 when the chapter leaves the screen mid-way", () => {
    const groupe = makeGroupe({ dureeMs: 1000 });
    const { result, rerender } = renderHook(
      ({ isPaused }) => usePresentationAutoAdvance(groupe, { isPaused }),
      { initialProps: { isPaused: false } },
    );

    now = 500;
    act(() => flushRaf());
    expect(result.current.progressRatio).toBeCloseTo(0.5);

    rerender({ isPaused: true });
    expect(result.current.progressRatio).toBe(0);

    now = 2000;
    rerender({ isPaused: false });
    now = 2100;
    act(() => flushRaf());
    expect(result.current.progressRatio).toBeCloseTo(0.1);
  });
});
