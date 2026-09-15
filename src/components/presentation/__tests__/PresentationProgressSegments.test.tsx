import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PresentationProgressSegments from "../PresentationProgressSegments";

describe("PresentationProgressSegments", () => {
  it("renders nothing when count is 0 (empty chapter)", () => {
    const { container } = render(
      <PresentationProgressSegments count={0} activeIndex={0} progressRatio={0} onSelect={vi.fn()} label="Écran" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when count is 1 (no progression to show)", () => {
    const { container } = render(
      <PresentationProgressSegments count={1} activeIndex={0} progressRatio={0.5} onSelect={vi.fn()} label="Écran" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders one tab per subtheme when count > 1", () => {
    render(<PresentationProgressSegments count={3} activeIndex={0} progressRatio={0} onSelect={vi.fn()} label="Écran" />);

    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("marks only the active segment as selected", () => {
    render(<PresentationProgressSegments count={3} activeIndex={1} progressRatio={0.5} onSelect={vi.fn()} label="Écran" />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(tabs[2]).toHaveAttribute("aria-selected", "false");
  });

  it("calls onSelect with the clicked segment's index", () => {
    const onSelect = vi.fn();
    render(<PresentationProgressSegments count={3} activeIndex={0} progressRatio={0} onSelect={onSelect} label="Écran" />);

    fireEvent.click(screen.getAllByRole("tab")[2]);

    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
