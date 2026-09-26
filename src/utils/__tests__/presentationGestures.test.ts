import { describe, it, expect, afterEach } from "vitest";
import {
  HOLD_MIN_DURATION_MS,
  SWIPE_DIRECTION_RATIO,
  SWIPE_MIN_DX_PX,
  TAP_MAX_DURATION_MS,
  TAP_MAX_MOVE_PX,
  classifyPointerGesture,
  isInteractiveTarget,
} from "../presentationGestures";

// Panneau de 300 px de large à partir de x = 0 : tiers gauche = [0, 100[.
const panel = { panelLeft: 0, panelWidth: 300 };

function gesture(overrides: Partial<Parameters<typeof classifyPointerGesture>[0]> = {}) {
  return classifyPointerGesture({
    dx: 0,
    dy: 0,
    durationMs: 100,
    startX: 200,
    wasHold: false,
    ...panel,
    ...overrides,
  });
}

describe("gesture thresholds (spec § 2.3)", () => {
  it("exposes the thresholds defined by the spec", () => {
    expect(TAP_MAX_MOVE_PX).toBe(10);
    expect(TAP_MAX_DURATION_MS).toBe(500);
    expect(HOLD_MIN_DURATION_MS).toBe(500);
    expect(SWIPE_MIN_DX_PX).toBe(40);
    expect(SWIPE_DIRECTION_RATIO).toBe(1.5);
  });
});

describe("classifyPointerGesture", () => {
  describe("tap", () => {
    it("in the left third goes to the previous screen", () => {
      expect(gesture({ startX: 50 })).toBe("prev");
      expect(gesture({ startX: 99 })).toBe("prev");
    });

    it("in the right two thirds goes to the next screen", () => {
      expect(gesture({ startX: 100 })).toBe("next");
      expect(gesture({ startX: 150 })).toBe("next");
      expect(gesture({ startX: 299 })).toBe("next");
    });

    it("takes the panel offset into account", () => {
      expect(gesture({ panelLeft: 400, panelWidth: 300, startX: 450 })).toBe("prev");
      expect(gesture({ panelLeft: 400, panelWidth: 300, startX: 550 })).toBe("next");
    });

    it("tolerates a small movement below 10 px", () => {
      expect(gesture({ startX: 50, dx: 6, dy: 6 })).toBe("prev"); // hypot ≈ 8,5
    });

    it("is not a tap when the finger moved 10 px or more", () => {
      expect(gesture({ dx: 0, dy: 10 })).toBe("none");
      expect(gesture({ dx: 8, dy: 8 })).toBe("none"); // hypot ≈ 11,3
    });

    it("is not a tap when it lasted 500 ms or more", () => {
      expect(gesture({ durationMs: 500 })).toBe("none");
      expect(gesture({ durationMs: 499 })).toBe("next");
    });
  });

  describe("swipe horizontal", () => {
    it("to the left goes to the next screen", () => {
      expect(gesture({ dx: -60, dy: 5 })).toBe("next");
    });

    it("to the right goes to the previous screen", () => {
      expect(gesture({ dx: 60, dy: 5 })).toBe("prev");
    });

    it("requires at least 40 px of horizontal movement", () => {
      expect(gesture({ dx: -40, dy: 0 })).toBe("next");
      expect(gesture({ dx: -39, dy: 0 })).toBe("none");
    });

    it("requires |dx| strictly greater than 1.5 × |dy|", () => {
      expect(gesture({ dx: -60, dy: 39 })).toBe("next");
      expect(gesture({ dx: -60, dy: 40 })).toBe("none");
    });

    it("is recognised regardless of its duration (slow swipe)", () => {
      expect(gesture({ dx: -80, dy: 0, durationMs: 1200 })).toBe("next");
    });
  });

  it("ignores vertical-dominant gestures (scroll natif entre chapitres)", () => {
    expect(gesture({ dx: 5, dy: -120 })).toBe("none");
    expect(gesture({ dx: -50, dy: 80 })).toBe("none");
  });

  it("returns none after a long press, even for a tap-like or swipe-like movement", () => {
    expect(gesture({ wasHold: true })).toBe("none");
    expect(gesture({ wasHold: true, dx: -80 })).toBe("none");
  });
});

describe("isInteractiveTarget", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns false for null or non-element targets", () => {
    expect(isInteractiveTarget(null)).toBe(false);
    expect(isInteractiveTarget(window)).toBe(false);
    expect(isInteractiveTarget(document.createTextNode("x"))).toBe(false);
  });

  it("returns false for plain content", () => {
    document.body.innerHTML = `<section><p id="t">Texte</p></section>`;
    expect(isInteractiveTarget(document.getElementById("t"))).toBe(false);
  });

  it.each([
    `<a href="#" id="t">lien</a>`,
    `<button id="t">b</button>`,
    `<input id="t" />`,
    `<select id="t"></select>`,
    `<textarea id="t"></textarea>`,
    `<div role="tab" id="t"></div>`,
    `<div role="button" id="t"></div>`,
    `<div contenteditable="true" id="t"></div>`,
  ])("returns true for %s", (html) => {
    document.body.innerHTML = html;
    expect(isInteractiveTarget(document.getElementById("t"))).toBe(true);
  });

  it("returns true for a descendant of an interactive element (icône dans un lien)", () => {
    document.body.innerHTML = `<a href="#"><svg><path id="t" /></svg><span id="s">Maps</span></a>`;
    expect(isInteractiveTarget(document.getElementById("s"))).toBe(true);
    expect(isInteractiveTarget(document.getElementById("t"))).toBe(true);
  });
});
