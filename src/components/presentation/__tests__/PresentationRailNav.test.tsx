import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PresentationRailNav from "../PresentationRailNav";

const labels = ["Présentation", "Règlement", "Fin"];

describe("PresentationRailNav", () => {
  it("renders nothing when there is 0 or 1 panel (nothing to navigate between)", () => {
    const { container: empty } = render(
      <PresentationRailNav labels={[]} activeIndex={0} onSelect={vi.fn()} navLabel="Chapitres" />,
    );
    expect(empty).toBeEmptyDOMElement();

    const { container: single } = render(
      <PresentationRailNav
        labels={["Présentation"]}
        activeIndex={0}
        onSelect={vi.fn()}
        navLabel="Chapitres"
      />,
    );
    expect(single).toBeEmptyDOMElement();
  });

  it("renders one dot per panel, named only through its accessible label", () => {
    render(
      <PresentationRailNav
        labels={labels}
        activeIndex={0}
        onSelect={vi.fn()}
        navLabel="Chapitres"
      />,
    );

    // Des pastilles, pas une table des matières : aucun libellé visible.
    expect(screen.getByRole("navigation", { name: "Chapitres" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Règlement" })).toHaveTextContent("");
  });

  it("marks the active panel with aria-current", () => {
    render(
      <PresentationRailNav
        labels={labels}
        activeIndex={1}
        onSelect={vi.fn()}
        navLabel="Chapitres"
      />,
    );

    expect(screen.getByRole("button", { name: "Présentation" })).toHaveAttribute(
      "aria-current",
      "false",
    );
    expect(screen.getByRole("button", { name: "Règlement" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("calls onSelect with the clicked panel's index", () => {
    const onSelect = vi.fn();
    render(
      <PresentationRailNav labels={labels} activeIndex={0} onSelect={onSelect} navLabel="Chapitres" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Règlement" }));

    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
