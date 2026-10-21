import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LayoutRoot from "../LayoutRoot";

vi.mock("../TopBar", () => ({
  default: () => <div data-testid="stub-topbar" />,
}));

vi.mock("../../navigation/Tabs", () => ({
  default: () => <div data-testid="stub-tabs" />,
}));

describe("LayoutRoot — impression (CA5)", () => {
  it("masque la TopBar et les Tabs à l'impression", () => {
    render(
      <LayoutRoot>
        <p>contenu</p>
      </LayoutRoot>,
    );

    expect(screen.getByTestId("stub-topbar").parentElement).toHaveClass("print:hidden");
    expect(screen.getByTestId("stub-tabs").closest(".fixed")).toHaveClass("print:hidden");
  });

  it("retire padding et largeur maximale du contenu à l'impression, sans changer l'écran", () => {
    render(
      <LayoutRoot>
        <p>contenu</p>
      </LayoutRoot>,
    );

    const conteneur = screen.getByText("contenu").parentElement as HTMLElement;
    expect(conteneur).toHaveClass("max-w-6xl", "print:max-w-none");
    expect(conteneur.closest("main")).toHaveClass("p-4", "print:p-0");
  });
});
