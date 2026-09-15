import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import PresentationBgLayerCarousel from "../PresentationBgLayerCarousel";

function getLayers(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll(".presentation-bg-layer"));
}

describe("PresentationBgLayerCarousel", () => {
  it("renders one stacked layer per subtheme", () => {
    const { container } = render(
      <PresentationBgLayerCarousel
        imageUrls={["https://x/a.png", "https://x/b.png", "https://x/c.png"]}
        activeIndex={0}
        enabled
      />,
    );

    expect(getLayers(container)).toHaveLength(3);
  });

  it("marks only the active layer as visible", () => {
    const { container } = render(
      <PresentationBgLayerCarousel
        imageUrls={["https://x/a.png", "https://x/b.png"]}
        activeIndex={1}
        enabled
      />,
    );

    const layers = getLayers(container);
    expect(layers[0]).not.toHaveClass("is-active");
    expect(layers[1]).toHaveClass("is-active");
  });

  it("applies each image as the background of its own layer", () => {
    const { container } = render(
      <PresentationBgLayerCarousel
        imageUrls={["https://x/a.png", "https://x/b.png"]}
        activeIndex={0}
        enabled
      />,
    );

    const layers = getLayers(container);
    expect(layers[0].style.backgroundImage).toContain("a.png");
    expect(layers[1].style.backgroundImage).toContain("b.png");
  });

  it("leaves the layer bare when a subtheme has no image, so the panel gradient shows through", () => {
    const { container } = render(
      <PresentationBgLayerCarousel imageUrls={[null]} activeIndex={0} enabled />,
    );

    const layers = getLayers(container);
    expect(layers).toHaveLength(1);
    expect(layers[0].style.backgroundImage).toBe("");
  });

  it("switches the visible layer when the active subtheme changes", () => {
    const { container, rerender } = render(
      <PresentationBgLayerCarousel
        imageUrls={["https://x/a.png", "https://x/b.png"]}
        activeIndex={0}
        enabled
      />,
    );

    rerender(
      <PresentationBgLayerCarousel
        imageUrls={["https://x/a.png", "https://x/b.png"]}
        activeIndex={1}
        enabled
      />,
    );

    const layers = getLayers(container);
    expect(layers[0]).not.toHaveClass("is-active");
    expect(layers[1]).toHaveClass("is-active");
  });

  // Google Drive throttle son endpoint /thumbnail (429) au-delà de quelques
  // requêtes concurrentes sur des fichiers différents — reproduit et documenté
  // dans docs/specs/decoupler-presentation-du-google-sheet-gerer-en-admin.track.md.
  // Charger les 27 photos du tournoi au premier rendu y a déjà été identifié
  // comme la cause : ces tests verrouillent le budget de préchargement.
  describe("Drive throttling guard (bounded concurrent image requests)", () => {
    it("does not set backgroundImage on any layer while disabled (chapter not yet visible)", () => {
      const { container } = render(
        <PresentationBgLayerCarousel
          imageUrls={["https://x/a.png", "https://x/b.png", "https://x/c.png"]}
          activeIndex={0}
          enabled={false}
        />,
      );

      const layers = getLayers(container);
      expect(layers.every((l) => l.style.backgroundImage === "")).toBe(true);
    });

    it("only loads the active subtheme's image and the next one, not the whole chapter", () => {
      const { container } = render(
        <PresentationBgLayerCarousel
          imageUrls={[
            "https://x/a.png",
            "https://x/b.png",
            "https://x/c.png",
            "https://x/d.png",
            "https://x/e.png",
          ]}
          activeIndex={1}
          enabled
        />,
      );

      const layers = getLayers(container);
      expect(layers[0].style.backgroundImage).toBe("");
      expect(layers[1].style.backgroundImage).toContain("b.png");
      expect(layers[2].style.backgroundImage).toContain("c.png");
      expect(layers[3].style.backgroundImage).toBe("");
      expect(layers[4].style.backgroundImage).toBe("");
    });

    it("shifts the preload window forward as the active subtheme advances", () => {
      const urls = ["https://x/a.png", "https://x/b.png", "https://x/c.png", "https://x/d.png"];
      const { container, rerender } = render(
        <PresentationBgLayerCarousel imageUrls={urls} activeIndex={0} enabled />,
      );
      expect(getLayers(container)[2].style.backgroundImage).toBe("");

      rerender(<PresentationBgLayerCarousel imageUrls={urls} activeIndex={2} enabled />);

      const layers = getLayers(container);
      expect(layers[0].style.backgroundImage).toBe("");
      expect(layers[1].style.backgroundImage).toBe("");
      expect(layers[2].style.backgroundImage).toContain("c.png");
      expect(layers[3].style.backgroundImage).toContain("d.png");
    });
  });
});
