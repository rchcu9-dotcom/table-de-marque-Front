import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PresentationNextButton from "../PresentationNextButton";

describe("PresentationNextButton", () => {
  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<PresentationNextButton onClick={onClick} label="Écran suivant" />);

    fireEvent.click(screen.getByTestId("presentation-next-button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("exposes its label to assistive tech without showing text (it is a faceoff dot)", () => {
    render(<PresentationNextButton onClick={vi.fn()} label="Écran suivant" />);

    const button = screen.getByRole("button", { name: "Écran suivant" });
    expect(button).toHaveTextContent("");
  });

  it("uses the localised label it is given", () => {
    render(<PresentationNextButton onClick={vi.fn()} label="Next screen" />);

    expect(screen.getByRole("button", { name: "Next screen" })).toBeInTheDocument();
  });
});
