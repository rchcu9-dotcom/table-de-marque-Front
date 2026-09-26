import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PresentationSubscreenNav from "../PresentationSubscreenNav";

function renderNav(props: Partial<React.ComponentProps<typeof PresentationSubscreenNav>> = {}) {
  const onPrev = vi.fn();
  const onNext = vi.fn();
  const utils = render(
    <PresentationSubscreenNav
      count={3}
      canPrev
      canNext
      onPrev={onPrev}
      onNext={onNext}
      prevLabel="Écran précédent"
      nextLabel="Écran suivant"
      {...props}
    />,
  );
  return { onPrev, onNext, ...utils };
}

describe("PresentationSubscreenNav", () => {
  it.each([0, 1])("renders nothing when count is %i (CA4)", (count) => {
    const { container } = renderNav({ count });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the two chevrons with their accessible names when count > 1 (CA4)", () => {
    renderNav();

    expect(screen.getByRole("button", { name: "Écran précédent" })).toHaveAttribute(
      "data-testid",
      "presentation-prev-screen",
    );
    expect(screen.getByRole("button", { name: "Écran suivant" })).toHaveAttribute(
      "data-testid",
      "presentation-next-screen",
    );
  });

  it("uses the labels passed as props (EN)", () => {
    renderNav({ prevLabel: "Previous screen", nextLabel: "Next screen" });

    expect(screen.getByRole("button", { name: "Previous screen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next screen" })).toBeInTheDocument();
  });

  it("calls onPrev / onNext when the chevrons are clicked (CA5)", () => {
    const { onPrev, onNext } = renderNav();

    fireEvent.click(screen.getByTestId("presentation-next-screen"));
    fireEvent.click(screen.getByTestId("presentation-prev-screen"));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("marks ‹ as aria-disabled on the first subscreen and ignores its clicks (CA5)", () => {
    const { onPrev } = renderNav({ canPrev: false });
    const prev = screen.getByTestId("presentation-prev-screen");

    expect(prev).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("presentation-next-screen")).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(prev);
    expect(onPrev).not.toHaveBeenCalled();
  });

  it("marks › as aria-disabled on the last subscreen and ignores its clicks (CA5)", () => {
    const { onNext } = renderNav({ canNext: false });
    const next = screen.getByTestId("presentation-next-screen");

    expect(next).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(next);
    expect(onNext).not.toHaveBeenCalled();
  });

  it("keeps the chevrons focusable at the bounds (no native disabled, A3)", () => {
    renderNav({ canPrev: false, canNext: false });
    const prev = screen.getByTestId("presentation-prev-screen");

    expect(prev).not.toBeDisabled();
    expect(screen.getByTestId("presentation-next-screen")).not.toBeDisabled();
    prev.focus();
    expect(prev).toHaveFocus();
  });

  it("uses type=button and hides the chevron icons from assistive tech", () => {
    const { container } = renderNav();

    screen.getAllByRole("button").forEach((b) => expect(b).toHaveAttribute("type", "button"));
    container.querySelectorAll("svg").forEach((svg) =>
      expect(svg).toHaveAttribute("aria-hidden", "true"),
    );
  });
});
