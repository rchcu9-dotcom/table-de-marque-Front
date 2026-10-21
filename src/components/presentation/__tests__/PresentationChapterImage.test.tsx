import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PresentationChapterImage from "../PresentationChapterImage";

describe("PresentationChapterImage", () => {
  it.each([
    ["null", null],
    ["vide", ""],
  ])("renders nothing when src is %s", (_label, src) => {
    const { container } = render(<PresentationChapterImage src={src} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId("chapter-image")).not.toBeInTheDocument();
  });

  it("renders a decorative, lazy-loaded banner image", () => {
    render(<PresentationChapterImage src="https://cdn.example.com/glace.jpg" />);

    const img = screen.getByTestId("chapter-image");
    expect(img.tagName).toBe("IMG");
    expect(img).toHaveAttribute("src", "https://cdn.example.com/glace.jpg");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
    expect(img).toHaveClass("presentation-chapter-image");
  });

  it("is ignored by assistive technologies (alt empty → presentation role)", () => {
    render(<PresentationChapterImage src="https://cdn.example.com/glace.jpg" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("appends an extra className while keeping the print-hidden class", () => {
    render(<PresentationChapterImage src="https://cdn.example.com/a.jpg" className="mt-4" />);

    const img = screen.getByTestId("chapter-image");
    expect(img).toHaveClass("presentation-chapter-image");
    expect(img).toHaveClass("mt-4");
  });

  it("removes itself when the image fails to load (no broken icon)", () => {
    render(<PresentationChapterImage src="https://cdn.example.com/missing.jpg" />);

    fireEvent.error(screen.getByTestId("chapter-image"));

    expect(screen.queryByTestId("chapter-image")).not.toBeInTheDocument();
  });

  it("retries when src changes after a failure", () => {
    const { rerender } = render(<PresentationChapterImage src="https://cdn.example.com/missing.jpg" />);
    fireEvent.error(screen.getByTestId("chapter-image"));

    rerender(<PresentationChapterImage src="https://cdn.example.com/ok.jpg" />);

    expect(screen.getByTestId("chapter-image")).toHaveAttribute("src", "https://cdn.example.com/ok.jpg");
  });

  it("stays hidden when re-rendered with the same failed src", () => {
    const { rerender } = render(<PresentationChapterImage src="https://cdn.example.com/missing.jpg" />);
    fireEvent.error(screen.getByTestId("chapter-image"));

    rerender(<PresentationChapterImage src="https://cdn.example.com/missing.jpg" />);

    expect(screen.queryByTestId("chapter-image")).not.toBeInTheDocument();
  });
});
