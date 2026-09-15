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

  it("next() wraps back to the first subtheme after the last one", () => {
    const { result } = renderHook(() =>
      usePresentationAutoAdvance(makeGroupe(), { isPaused: true }),
    );

    act(() => result.current.goTo(1));
    act(() => result.current.next());

    expect(result.current.activeIndex).toBe(0);
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
});
