import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, fireEvent } from "@testing-library/react";
import {
  shouldHandleSubscreenKey,
  usePresentationKeyboardNav,
} from "../usePresentationKeyboardNav";

type KeyInput = Parameters<typeof shouldHandleSubscreenKey>[0];

function key(overrides: Partial<KeyInput> = {}): KeyInput {
  return {
    key: "ArrowRight",
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    defaultPrevented: false,
    target: document.body,
    ...overrides,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("shouldHandleSubscreenKey", () => {
  it("maps ArrowRight to next and ArrowLeft to prev", () => {
    expect(shouldHandleSubscreenKey(key({ key: "ArrowRight" }))).toBe("next");
    expect(shouldHandleSubscreenKey(key({ key: "ArrowLeft" }))).toBe("prev");
  });

  it.each(["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Enter", "Tab"])(
    "never intercepts %j (comportement natif, CA13)",
    (k) => {
      expect(shouldHandleSubscreenKey(key({ key: k }))).toBeNull();
    },
  );

  it.each(["altKey", "ctrlKey", "metaKey", "shiftKey"] as const)(
    "ignores arrows pressed with %s (CA12)",
    (modifier) => {
      expect(shouldHandleSubscreenKey(key({ [modifier]: true }))).toBeNull();
    },
  );

  it("ignores an event already handled (defaultPrevented)", () => {
    expect(shouldHandleSubscreenKey(key({ defaultPrevented: true }))).toBeNull();
  });

  it.each([
    `<input id="t" />`,
    `<textarea id="t"></textarea>`,
    `<select id="t"></select>`,
    `<div contenteditable="true"><span id="t">x</span></div>`,
  ])("ignores arrows when the focus is in a text field: %s (CA12)", (html) => {
    document.body.innerHTML = html;
    expect(shouldHandleSubscreenKey(key({ target: document.getElementById("t") }))).toBeNull();
  });

  it("still handles arrows inside contenteditable=false", () => {
    document.body.innerHTML = `<div contenteditable="false" id="t"></div>`;
    expect(shouldHandleSubscreenKey(key({ target: document.getElementById("t") }))).toBe("next");
  });

  it("handles arrows when the focus is on a progress segment (role=tab)", () => {
    document.body.innerHTML = `<button role="tab" id="t"></button>`;
    expect(shouldHandleSubscreenKey(key({ target: document.getElementById("t") }))).toBe("next");
  });

  it("handles arrows when the target is null or not an element", () => {
    expect(shouldHandleSubscreenKey(key({ target: null }))).toBe("next");
    expect(shouldHandleSubscreenKey(key({ target: window }))).toBe("next");
  });
});

describe("usePresentationKeyboardNav", () => {
  function setup(enabled: boolean) {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const hook = renderHook((props: { enabled: boolean }) =>
      usePresentationKeyboardNav({ enabled: props.enabled, onPrev, onNext }),
      { initialProps: { enabled } },
    );
    return { onPrev, onNext, ...hook };
  }

  it("calls onNext / onPrev once per key press when enabled (un appui = un changement)", () => {
    const { onPrev, onNext } = setup(true);

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("does not listen when disabled (chapitre non actif, CA11)", () => {
    const { onPrev, onNext } = setup(false);

    fireEvent.keyDown(document, { key: "ArrowRight" });
    fireEvent.keyDown(document, { key: "ArrowLeft" });

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrev).not.toHaveBeenCalled();
  });

  it("attaches and detaches the listener when enabled toggles", () => {
    const { onNext, rerender } = setup(false);

    rerender({ enabled: true });
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(onNext).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("removes the listener on unmount", () => {
    const { onNext, unmount } = setup(true);
    unmount();

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(onNext).not.toHaveBeenCalled();
  });

  it("prevents the default action only for handled keys", () => {
    setup(true);

    const handled = new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true });
    document.dispatchEvent(handled);
    expect(handled.defaultPrevented).toBe(true);

    const native = new KeyboardEvent("keydown", { key: "ArrowDown", cancelable: true });
    document.dispatchEvent(native);
    expect(native.defaultPrevented).toBe(false);

    const withModifier = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      altKey: true,
      cancelable: true,
    });
    document.dispatchEvent(withModifier);
    expect(withModifier.defaultPrevented).toBe(false);
  });

  it("ignores arrows typed in an input", () => {
    const { onNext } = setup(true);
    document.body.innerHTML = `<input id="field" />`;

    fireEvent.keyDown(document.getElementById("field")!, { key: "ArrowRight" });
    expect(onNext).not.toHaveBeenCalled();
  });

  it("always uses the latest callbacks without re-subscribing", () => {
    const first = vi.fn();
    const second = vi.fn();
    const addSpy = vi.spyOn(document, "addEventListener");
    const { rerender } = renderHook(
      ({ onNext }: { onNext: () => void }) =>
        usePresentationKeyboardNav({ enabled: true, onPrev: () => {}, onNext }),
      { initialProps: { onNext: first } },
    );
    const keydownSubscriptions = () =>
      addSpy.mock.calls.filter(([type]) => type === "keydown").length;
    expect(keydownSubscriptions()).toBe(1);

    rerender({ onNext: second });
    fireEvent.keyDown(document, { key: "ArrowRight" });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(keydownSubscriptions()).toBe(1);
    addSpy.mockRestore();
  });
});
