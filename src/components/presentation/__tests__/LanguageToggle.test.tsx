import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import LanguageToggle from "../LanguageToggle";

describe("LanguageToggle", () => {
  it("marks the active language button as pressed", () => {
    render(<LanguageToggle lang="fr" onChange={vi.fn()} />);

    expect(screen.getByTestId("presentation-language-fr")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("presentation-language-en")).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with 'en' when the EN button is clicked", () => {
    const onChange = vi.fn();
    render(<LanguageToggle lang="fr" onChange={onChange} />);

    fireEvent.click(screen.getByTestId("presentation-language-en"));

    expect(onChange).toHaveBeenCalledWith("en");
  });

  it("calls onChange with 'fr' when the FR button is clicked", () => {
    const onChange = vi.fn();
    render(<LanguageToggle lang="en" onChange={onChange} />);

    fireEvent.click(screen.getByTestId("presentation-language-fr"));

    expect(onChange).toHaveBeenCalledWith("fr");
  });
});
