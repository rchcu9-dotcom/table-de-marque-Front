import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PresentationPlayPauseButton from "../PresentationPlayPauseButton";

describe("PresentationPlayPauseButton", () => {
  it.each([
    ["fr", false, "Mettre en pause le défilement"],
    ["fr", true, "Reprendre le défilement"],
    ["en", false, "Pause slideshow"],
    ["en", true, "Play slideshow"],
  ] as const)("lang=%s isPaused=%s → libellé « %s » (CA16)", (lang, isPaused, label) => {
    render(<PresentationPlayPauseButton isPaused={isPaused} onToggle={vi.fn()} lang={lang} />);

    const button = screen.getByRole("button", { name: label });
    expect(button).toHaveAttribute("aria-pressed", String(isPaused));
    expect(button).toHaveAttribute("data-testid", "presentation-autoplay-toggle");
    expect(button).toHaveAttribute("type", "button");
  });

  it("calls onToggle on click", () => {
    const onToggle = vi.fn();
    render(<PresentationPlayPauseButton isPaused={false} onToggle={onToggle} lang="fr" />);

    fireEvent.click(screen.getByTestId("presentation-autoplay-toggle"));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("switches its icon between pause (two bars) and play (triangle), hidden from assistive tech", () => {
    const { container, rerender } = render(
      <PresentationPlayPauseButton isPaused={false} onToggle={vi.fn()} lang="fr" />,
    );
    expect(container.querySelectorAll("rect")).toHaveLength(2);
    expect(container.querySelector("path")).toBeNull();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

    rerender(<PresentationPlayPauseButton isPaused onToggle={vi.fn()} lang="fr" />);
    expect(container.querySelectorAll("rect")).toHaveLength(0);
    expect(container.querySelector("path")).not.toBeNull();
  });
});
