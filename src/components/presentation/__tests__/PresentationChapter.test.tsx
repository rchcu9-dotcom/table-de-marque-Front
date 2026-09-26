import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PresentationChapter from "../PresentationChapter";
import type { ArticlePresentation, PresentationGroupe } from "../../../api/presentation";

function makeArticle(titre: string, overrides: Partial<ArticlePresentation> = {}): ArticlePresentation {
  return {
    groupe: "Présentation",
    groupeEn: "Presentation",
    surtitre: `Surtitre ${titre}`,
    surtitreEn: `Eyebrow ${titre}`,
    titre,
    titreEn: titre,
    description: `Texte de ${titre}`,
    descriptionEn: `Text of ${titre}`,
    faits: "",
    faitsEn: "",
    titreAccroche: "", titreAccrocheEn: "", descriptionCourte: "", descriptionCourteEn: "",
    imageUrl: null,
    lienUrl: null,
    lieu: null,
    mapsQuery: null,
    ...overrides,
  };
}

function makeGroupe(overrides: Partial<PresentationGroupe> = {}): PresentationGroupe {
  return {
    nom: "Présentation",
    nomEn: "Presentation",
    ordre: 0,
    dureeMs: 5000,
    imageUrl: null,
    articles: [makeArticle("Résumé"), makeArticle("Inscription")],
    ...overrides,
  };
}

const threeScreens = () =>
  makeGroupe({ articles: [makeArticle("Un"), makeArticle("Deux"), makeArticle("Trois")] });

type ChapterProps = React.ComponentProps<typeof PresentationChapter>;

function renderChapter(props: Partial<ChapterProps> = {}) {
  const onNextPanel = vi.fn();
  const onUserPausedChange = vi.fn();
  const element = (p: Partial<ChapterProps>) => (
    <MemoryRouter>
      <PresentationChapter
        groupe={makeGroupe()}
        index={0}
        total={2}
        tokens={{}}
        lang="fr"
        onNextPanel={onNextPanel}
        onVisibleChange={() => {}}
        isActive={false}
        isUserPaused={false}
        onUserPausedChange={onUserPausedChange}
        {...p}
      />
    </MemoryRouter>
  );
  const utils = render(element(props));
  return {
    onNextPanel,
    onUserPausedChange,
    rerenderWith: (next: Partial<ChapterProps>) => utils.rerender(element({ ...props, ...next })),
  };
}

function activeSubtheme(titre: string) {
  return screen.getByTestId(`presentation-subtheme-${titre}`).getAttribute("aria-hidden") === "false";
}

function selectedTabIndex() {
  return screen.getAllByRole("tab").findIndex((t) => t.getAttribute("aria-selected") === "true");
}

// Faux RAF + horloge (même principe que usePresentationAutoAdvance.test.ts) :
// permet de vérifier si l'avance automatique tourne, est figée ou arrêtée.
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

describe("PresentationChapter", () => {
  it("renders the chapter label with its position and name", () => {
    renderChapter({ index: 1, total: 4, groupe: makeGroupe({ nom: "Règlement" }) });

    expect(screen.getByText(/Chapitre 2 \/ 4 — Règlement/)).toBeInTheDocument();
  });

  it("only shows the first subtheme as active initially", () => {
    renderChapter();

    expect(screen.getByTestId("presentation-subtheme-Résumé")).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByTestId("presentation-subtheme-Inscription")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders progress segments when the chapter has more than one subtheme", () => {
    renderChapter();

    expect(screen.getByTestId("presentation-progress-segments")).toBeInTheDocument();
  });

  it("clicking a progress segment jumps directly to that subtheme", () => {
    renderChapter();

    fireEvent.click(screen.getAllByRole("tab")[1]);

    expect(screen.getByTestId("presentation-subtheme-Inscription")).toHaveAttribute("aria-hidden", "false");
  });

  describe("flèche ↓ : toujours « chapitre suivant » (CA1-CA3)", () => {
    it.each([0, 1, 2])(
      "calls onNextPanel without changing subscreen when subscreen %i is active",
      (startIndex) => {
        const { onNextPanel } = renderChapter({ groupe: threeScreens() });
        if (startIndex > 0) fireEvent.click(screen.getAllByRole("tab")[startIndex]);

        fireEvent.click(screen.getByTestId("presentation-next-button"));

        expect(onNextPanel).toHaveBeenCalledTimes(1);
        expect(selectedTabIndex()).toBe(startIndex);
      },
    );

    it("calls onNextPanel on every click, never advancing the subscreen", () => {
      const { onNextPanel } = renderChapter();

      fireEvent.click(screen.getByTestId("presentation-next-button"));
      fireEvent.click(screen.getByTestId("presentation-next-button"));

      expect(onNextPanel).toHaveBeenCalledTimes(2);
      expect(activeSubtheme("Résumé")).toBe(true);
    });

    it("is named « Chapitre suivant » in FR and « Next chapter » in EN", () => {
      const { rerenderWith } = renderChapter();
      expect(screen.getByTestId("presentation-next-button")).toHaveAccessibleName("Chapitre suivant");

      rerenderWith({ lang: "en" });
      expect(screen.getByTestId("presentation-next-button")).toHaveAccessibleName("Next chapter");
    });

    it("is still rendered on the last chapter (it leads to the outro, D1)", () => {
      const { onNextPanel } = renderChapter({ index: 1, total: 2 });

      fireEvent.click(screen.getByTestId("presentation-next-button"));
      expect(onNextPanel).toHaveBeenCalledTimes(1);
    });

    it("renders a neutral fallback and jumps to the next chapter when the group has zero subthemes", () => {
      const { onNextPanel } = renderChapter({ groupe: makeGroupe({ articles: [] }) });

      expect(screen.queryByTestId("presentation-progress-segments")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Présentation" })).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("presentation-next-button"));

      expect(onNextPanel).toHaveBeenCalledTimes(1);
    });
  });

  describe("chevrons ‹ / › (CA4, CA5)", () => {
    it.each([
      ["zero", []],
      ["one", [makeArticle("Seul")]],
    ])("renders no chevron and no play/pause button when the chapter has %s subtheme", (_l, articles) => {
      renderChapter({ groupe: makeGroupe({ articles }) });

      expect(screen.queryByTestId("presentation-prev-screen")).not.toBeInTheDocument();
      expect(screen.queryByTestId("presentation-next-screen")).not.toBeInTheDocument();
      expect(screen.queryByTestId("presentation-autoplay-toggle")).not.toBeInTheDocument();
    });

    it("› advances and ‹ goes back one subscreen, bounded without wrapping", () => {
      renderChapter({ groupe: threeScreens() });
      const prev = screen.getByTestId("presentation-prev-screen");
      const next = screen.getByTestId("presentation-next-screen");

      expect(prev).toHaveAttribute("aria-disabled", "true");
      expect(next).toHaveAttribute("aria-disabled", "false");

      fireEvent.click(next);
      expect(activeSubtheme("Deux")).toBe(true);
      expect(prev).toHaveAttribute("aria-disabled", "false");

      fireEvent.click(next);
      expect(activeSubtheme("Trois")).toBe(true);
      expect(next).toHaveAttribute("aria-disabled", "true");

      fireEvent.click(next); // borne : pas de bouclage
      expect(activeSubtheme("Trois")).toBe(true);

      fireEvent.click(prev);
      expect(activeSubtheme("Deux")).toBe(true);
      fireEvent.click(prev);
      fireEvent.click(prev); // borne
      expect(activeSubtheme("Un")).toBe(true);
    });

    it("localises the chevron labels", () => {
      const { rerenderWith } = renderChapter();
      expect(screen.getByRole("button", { name: "Écran précédent" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Écran suivant" })).toBeInTheDocument();

      rerenderWith({ lang: "en" });
      expect(screen.getByRole("button", { name: "Previous screen" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Next screen" })).toBeInTheDocument();
    });
  });

  describe("annonces aria-live (§ 2.7)", () => {
    it("announces the new subscreen headline after a manual navigation", () => {
      renderChapter({
        groupe: makeGroupe({
          articles: [makeArticle("Résumé"), makeArticle("Inscription", { titreAccroche: "Inscris ton équipe" })],
        }),
      });
      const announcer = screen.getByTestId("presentation-subscreen-announcer");
      expect(announcer).toHaveAttribute("aria-live", "polite");
      expect(announcer).toHaveTextContent("");

      fireEvent.click(screen.getByTestId("presentation-next-screen"));
      expect(announcer).toHaveTextContent("Inscris ton équipe");

      fireEvent.click(screen.getByTestId("presentation-prev-screen"));
      expect(announcer).toHaveTextContent("Résumé");
    });

    it("announces the target of a segment click", () => {
      renderChapter({ groupe: threeScreens() });

      fireEvent.click(screen.getAllByRole("tab")[2]);
      expect(screen.getByTestId("presentation-subscreen-announcer")).toHaveTextContent("Trois");
    });

    it("does not announce anything when a manual action hits a bound", () => {
      renderChapter();

      fireEvent.click(screen.getByTestId("presentation-prev-screen"));
      expect(screen.getByTestId("presentation-subscreen-announcer")).toHaveTextContent("");
    });

    it("never announces the automatic advance", () => {
      renderChapter({ groupe: makeGroupe({ dureeMs: 1000 }) });

      now = 1000;
      act(() => flushRaf());

      expect(activeSubtheme("Inscription")).toBe(true);
      expect(screen.getByTestId("presentation-subscreen-announcer")).toHaveTextContent("");
    });
  });

  describe("clavier ←/→ (CA11, CA12)", () => {
    it("the active chapter reacts to ArrowRight / ArrowLeft, bounded", () => {
      renderChapter({ groupe: threeScreens(), isActive: true });

      fireEvent.keyDown(document, { key: "ArrowRight" });
      expect(activeSubtheme("Deux")).toBe(true);
      fireEvent.keyDown(document, { key: "ArrowRight" });
      fireEvent.keyDown(document, { key: "ArrowRight" });
      expect(activeSubtheme("Trois")).toBe(true);
      fireEvent.keyDown(document, { key: "ArrowLeft" });
      expect(activeSubtheme("Deux")).toBe(true);
      expect(screen.getByTestId("presentation-subscreen-announcer")).toHaveTextContent("Deux");
    });

    it("an inactive chapter does not react to the arrows", () => {
      renderChapter({ groupe: threeScreens(), isActive: false });

      fireEvent.keyDown(document, { key: "ArrowRight" });
      expect(activeSubtheme("Un")).toBe(true);
    });

    it("starts listening when the chapter becomes active", () => {
      const { rerenderWith } = renderChapter({ groupe: threeScreens(), isActive: false });

      rerenderWith({ isActive: true });
      fireEvent.keyDown(document, { key: "ArrowRight" });
      expect(activeSubtheme("Deux")).toBe(true);
    });

    it("ignores arrows pressed with a modifier", () => {
      renderChapter({ groupe: threeScreens(), isActive: true });

      fireEvent.keyDown(document, { key: "ArrowRight", altKey: true });
      fireEvent.keyDown(document, { key: "ArrowRight", ctrlKey: true });
      fireEvent.keyDown(document, { key: "ArrowRight", metaKey: true });
      fireEvent.keyDown(document, { key: "ArrowRight", shiftKey: true });
      expect(activeSubtheme("Un")).toBe(true);
    });

    it("a single press on a focused segment changes the subscreen exactly once (R3)", () => {
      renderChapter({ groupe: threeScreens(), isActive: true });
      const firstTab = screen.getAllByRole("tab")[0];
      firstTab.focus();

      fireEvent.keyDown(firstTab, { key: "ArrowRight" });

      expect(selectedTabIndex()).toBe(1);
      expect(activeSubtheme("Deux")).toBe(true);
    });

    it("does not listen at all for a single-subtheme chapter", () => {
      renderChapter({ groupe: makeGroupe({ articles: [makeArticle("Seul")] }), isActive: true });

      const event = new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true });
      document.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe("gestes tactiles (CA8, CA9)", () => {
    function panel() {
      return screen.getByTestId("presentation-chapter-Présentation");
    }

    it("a tap on the panel advances one subscreen", () => {
      renderChapter({ groupe: threeScreens() });

      fireEvent.pointerDown(panel(), { pointerType: "touch", pointerId: 1, clientX: 200, clientY: 300 });
      fireEvent.pointerUp(panel(), { pointerType: "touch", pointerId: 1, clientX: 200, clientY: 300 });

      expect(activeSubtheme("Deux")).toBe(true);
    });

    it("a swipe to the right goes back, a swipe to the left advances", () => {
      renderChapter({ groupe: threeScreens() });
      fireEvent.click(screen.getAllByRole("tab")[1]);

      fireEvent.pointerDown(panel(), { pointerType: "touch", pointerId: 1, clientX: 100, clientY: 300 });
      fireEvent.pointerUp(panel(), { pointerType: "touch", pointerId: 1, clientX: 200, clientY: 310 });
      expect(activeSubtheme("Un")).toBe(true);

      fireEvent.pointerDown(panel(), { pointerType: "touch", pointerId: 2, clientX: 200, clientY: 300 });
      fireEvent.pointerUp(panel(), { pointerType: "touch", pointerId: 2, clientX: 100, clientY: 290 });
      expect(activeSubtheme("Deux")).toBe(true);
    });

    it("a vertical gesture does not change the subscreen", () => {
      renderChapter({ groupe: threeScreens() });

      fireEvent.pointerDown(panel(), { pointerType: "touch", pointerId: 1, clientX: 200, clientY: 500 });
      fireEvent.pointerUp(panel(), { pointerType: "touch", pointerId: 1, clientX: 205, clientY: 200 });

      expect(activeSubtheme("Un")).toBe(true);
    });

    it("a tap on a segment keeps its own behaviour and does not trigger the tap navigation", () => {
      renderChapter({ groupe: threeScreens() });
      const thirdTab = screen.getAllByRole("tab")[2];

      fireEvent.pointerDown(thirdTab, { pointerType: "touch", pointerId: 1, clientX: 50, clientY: 20 });
      fireEvent.pointerUp(thirdTab, { pointerType: "touch", pointerId: 1, clientX: 50, clientY: 20 });
      fireEvent.click(thirdTab);

      expect(activeSubtheme("Trois")).toBe(true);
    });

    it("mouse clicks on the panel background do not navigate", () => {
      renderChapter({ groupe: threeScreens() });

      fireEvent.pointerDown(panel(), { pointerType: "mouse", pointerId: 1, clientX: 200, clientY: 300 });
      fireEvent.pointerUp(panel(), { pointerType: "mouse", pointerId: 1, clientX: 200, clientY: 300 });

      expect(activeSubtheme("Un")).toBe(true);
    });
  });

  describe("avance automatique et pauses (CA14-CA17)", () => {
    function progressWidth() {
      const current = screen.getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true")!;
      return (current.querySelector("i") as HTMLElement).style.width;
    }

    it("mouse hover on the panel freezes the progress, leaving resumes it from there (CA14)", () => {
      renderChapter({ groupe: makeGroupe({ dureeMs: 1000 }) });
      const panel = screen.getByTestId("presentation-chapter-Présentation");

      now = 400;
      act(() => flushRaf());
      expect(progressWidth()).toBe("40%");

      fireEvent.pointerEnter(panel, { pointerType: "mouse" });
      expect(rafCallbacks.size).toBe(0);
      now = 5000;
      act(() => flushRaf());
      expect(progressWidth()).toBe("40%");

      fireEvent.pointerLeave(panel, { pointerType: "mouse" });
      now = 5100;
      act(() => flushRaf());
      expect(progressWidth()).toBe("50%");
    });

    function stubFocusVisible(value: boolean | "throw") {
      const original = Element.prototype.matches;
      vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, selector: string) {
        if (selector === ":focus-visible") {
          if (value === "throw") throw new SyntaxError("unsupported");
          return value;
        }
        return original.call(this, selector);
      });
    }

    it("keyboard focus inside the panel freezes the progress, focus leaving the panel resumes it (CA14)", () => {
      stubFocusVisible(true);
      render(<button data-testid="outside">dehors</button>);
      renderChapter({ groupe: makeGroupe({ dureeMs: 1000 }) });

      now = 400;
      act(() => flushRaf());
      act(() => screen.getByTestId("presentation-next-screen").focus());
      expect(rafCallbacks.size).toBe(0);

      // Focus déplacé à l'intérieur du panneau : toujours figé.
      now = 5000;
      act(() => screen.getByTestId("presentation-prev-screen").focus());
      expect(rafCallbacks.size).toBe(0);
      act(() => flushRaf());
      expect(progressWidth()).toBe("40%");

      act(() => screen.getByTestId("outside").focus());
      now = 5100;
      act(() => flushRaf());
      expect(progressWidth()).toBe("50%");
    });

    it("mouse focus (not :focus-visible) does not freeze the progress", () => {
      stubFocusVisible(false);
      renderChapter({ groupe: makeGroupe({ dureeMs: 1000 }) });

      act(() => screen.getByTestId("presentation-next-screen").focus());

      expect(rafCallbacks.size).toBeGreaterThan(0);
    });

    it("falls back to freezing on focus when :focus-visible is not supported", () => {
      stubFocusVisible("throw");
      renderChapter({ groupe: makeGroupe({ dureeMs: 1000 }) });

      act(() => screen.getByTestId("presentation-next-screen").focus());

      expect(rafCallbacks.size).toBe(0);
    });

    it("touch pointerenter does not freeze the progress (R5)", () => {
      renderChapter({ groupe: makeGroupe({ dureeMs: 1000 }) });

      fireEvent.pointerEnter(screen.getByTestId("presentation-chapter-Présentation"), {
        pointerType: "touch",
      });

      expect(rafCallbacks.size).toBeGreaterThan(0);
    });

    it("a long press freezes the progress and releasing it does not change screen (CA10)", () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        renderChapter({ groupe: makeGroupe({ dureeMs: 1000 }) });
        const panel = screen.getByTestId("presentation-chapter-Présentation");

        now = 200;
        act(() => flushRaf());
        fireEvent.pointerDown(panel, { pointerType: "touch", pointerId: 1, clientX: 200, clientY: 300 });
        act(() => {
          vi.advanceTimersByTime(500);
        });
        expect(rafCallbacks.size).toBe(0);

        now = 3000;
        fireEvent.pointerUp(panel, { pointerType: "touch", pointerId: 1, clientX: 200, clientY: 300 });
        expect(activeSubtheme("Résumé")).toBe(true);
        expect(progressWidth()).toBe("20%");

        now = 3300;
        act(() => flushRaf());
        expect(progressWidth()).toBe("50%");
      } finally {
        vi.useRealTimers();
      }
    });

    it("a manual action stops the auto-advance while the chapter stays on screen (CA15)", () => {
      renderChapter({ groupe: threeScreens() });

      fireEvent.click(screen.getByTestId("presentation-next-screen"));

      expect(rafCallbacks.size).toBe(0);
      now = 60_000;
      act(() => flushRaf());
      expect(activeSubtheme("Deux")).toBe(true);
      expect(progressWidth()).toBe("0%");
    });

    it("after leaving and coming back, the auto-advance resumes from the current subscreen (CA15, D6)", () => {
      const observed: IntersectionObserverCallback[] = [];
      class FakeIntersectionObserver {
        constructor(callback: IntersectionObserverCallback) {
          observed.push(callback);
        }
        observe = vi.fn();
        disconnect = vi.fn();
        unobserve = vi.fn();
      }
      vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
      renderChapter({ groupe: { ...threeScreens(), dureeMs: 1000 } });
      const [callback] = observed;
      const setVisible = (isIntersecting: boolean) =>
        act(() => {
          callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
        });

      fireEvent.click(screen.getByTestId("presentation-next-screen"));
      expect(screen.getByTestId("presentation-autoplay-toggle")).toHaveAttribute("aria-pressed", "true");

      setVisible(false);
      setVisible(true);
      expect(screen.getByTestId("presentation-autoplay-toggle")).toHaveAttribute("aria-pressed", "false");

      now = 1000;
      act(() => flushRaf());
      expect(activeSubtheme("Trois")).toBe(true);
    });

    describe("bouton pause/lecture (CA16, CA17)", () => {
      it("is rendered next to the segments with aria-pressed=false and a FR label", () => {
        renderChapter();

        const toggle = screen.getByTestId("presentation-autoplay-toggle");
        expect(toggle).toHaveAttribute("aria-pressed", "false");
        expect(toggle).toHaveAccessibleName("Mettre en pause le défilement");
        expect(toggle.closest(".presentation-progress-row")).not.toBeNull();
      });

      it("asks the page to pause globally when clicked", () => {
        const { onUserPausedChange } = renderChapter();

        fireEvent.click(screen.getByTestId("presentation-autoplay-toggle"));

        expect(onUserPausedChange).toHaveBeenCalledWith(true);
      });

      it("reflects the global pause and asks to resume when clicked", () => {
        const { onUserPausedChange } = renderChapter({ isUserPaused: true, lang: "en" });

        const toggle = screen.getByTestId("presentation-autoplay-toggle");
        expect(toggle).toHaveAttribute("aria-pressed", "true");
        expect(toggle).toHaveAccessibleName("Play slideshow");
        fireEvent.click(toggle);

        expect(onUserPausedChange).toHaveBeenCalledWith(false);
      });

      it("the global pause freezes the progress without resetting it", () => {
        const { rerenderWith } = renderChapter({ groupe: makeGroupe({ dureeMs: 1000 }) });

        now = 300;
        act(() => flushRaf());
        rerenderWith({ isUserPaused: true });
        expect(rafCallbacks.size).toBe(0);
        now = 9000;
        act(() => flushRaf());
        expect(progressWidth()).toBe("30%");
        expect(activeSubtheme("Résumé")).toBe(true);
      });

      it("shows « play » after a manual action, and clicking it lifts the suspension (A4)", () => {
        const { onUserPausedChange } = renderChapter({ groupe: makeGroupe({ dureeMs: 1000 }) });

        fireEvent.click(screen.getAllByRole("tab")[1]);
        const toggle = screen.getByTestId("presentation-autoplay-toggle");
        expect(toggle).toHaveAttribute("aria-pressed", "true");
        expect(toggle).toHaveAccessibleName("Reprendre le défilement");

        fireEvent.click(toggle);
        expect(onUserPausedChange).toHaveBeenCalledWith(false);
        expect(toggle).toHaveAttribute("aria-pressed", "false");

        now = 1000;
        act(() => flushRaf());
        expect(activeSubtheme("Résumé")).toBe(true); // bouclage automatique conservé
      });

      it("clicking play with the mouse over the panel resumes immediately, without leaving the panel", () => {
        const { rerenderWith } = renderChapter({ groupe: makeGroupe({ dureeMs: 1000 }), isUserPaused: true });
        const panel = screen.getByTestId("presentation-chapter-Présentation");

        fireEvent.pointerEnter(panel, { pointerType: "mouse" });
        fireEvent.click(screen.getByTestId("presentation-autoplay-toggle"));
        rerenderWith({ isUserPaused: false });

        expect(rafCallbacks.size).toBeGreaterThan(0);
        now = 500;
        act(() => flushRaf());
        expect(progressWidth()).toBe("50%");
      });

      it("is not rendered under prefers-reduced-motion, while chevrons and keyboard still work (CA17)", () => {
        vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
        renderChapter({ groupe: threeScreens(), isActive: true });

        expect(screen.queryByTestId("presentation-autoplay-toggle")).not.toBeInTheDocument();
        expect(rafCallbacks.size).toBe(0);

        fireEvent.click(screen.getByTestId("presentation-next-screen"));
        expect(activeSubtheme("Deux")).toBe(true);
        fireEvent.keyDown(document, { key: "ArrowRight" });
        expect(activeSubtheme("Trois")).toBe(true);
      });
    });
  });

  it("orders the DOM for a logical tab order: segments → content → ‹ → › → ↓", () => {
    renderChapter();

    const order = [
      screen.getAllByRole("tab")[0],
      screen.getByTestId("presentation-autoplay-toggle"),
      screen.getByTestId("presentation-prev-screen"),
      screen.getByTestId("presentation-next-screen"),
      screen.getByTestId("presentation-next-button"),
    ];
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("reports its visibility changes via onVisibleChange, used to pause auto-advance and sync the rail nav", () => {
    const observed: IntersectionObserverCallback[] = [];
    class FakeIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observed.push(callback);
      }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    const onVisibleChange = vi.fn();

    renderChapter({ index: 2, onVisibleChange });

    const [callback] = observed;
    act(() => {
      callback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(onVisibleChange).toHaveBeenCalledWith(2, false);

    act(() => {
      callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(onVisibleChange).toHaveBeenCalledWith(2, true);
  });

  it("reports itself as visible immediately when IntersectionObserver is unavailable", () => {
    const onVisibleChange = vi.fn();

    renderChapter({ index: 3, onVisibleChange });

    expect(onVisibleChange).toHaveBeenCalledWith(3, true);
  });
});
