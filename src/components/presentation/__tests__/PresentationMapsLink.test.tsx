import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import PresentationMapsLink from "../PresentationMapsLink";

describe("PresentationMapsLink", () => {
  it("renders nothing when mapsQuery is null", () => {
    const { container } = render(
      <PresentationMapsLink mapsQuery={null} lieu="Cergy" label="Voir sur la carte" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("builds a Google Maps search link from the mapsQuery, URI-encoded", () => {
    render(
      <PresentationMapsLink mapsQuery="48.03,2.03" lieu={null} label="Voir sur la carte" />,
    );

    const link = screen.getByTestId("presentation-maps-link");
    expect(link).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=48.03%2C2.03",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("displays the lieu as the link text when provided", () => {
    render(
      <PresentationMapsLink mapsQuery="48.03,2.03" lieu="Patinoire de Cergy" label="Voir sur la carte" />,
    );

    expect(screen.getByText("Patinoire de Cergy")).toBeInTheDocument();
  });

  it("falls back to the generic label when lieu is absent", () => {
    render(<PresentationMapsLink mapsQuery="48.03,2.03" lieu={null} label="Voir sur la carte" />);

    expect(screen.getByText("Voir sur la carte")).toBeInTheDocument();
  });

  it("falls back to the generic label when lieu is only whitespace", () => {
    render(<PresentationMapsLink mapsQuery="48.03,2.03" lieu="   " label="Voir sur la carte" />);

    expect(screen.getByText("Voir sur la carte")).toBeInTheDocument();
  });
});
