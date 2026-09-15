import { describe, it, expect } from "vitest";
import { isImageUrl } from "../isImageUrl";

describe("isImageUrl", () => {
  it.each([
    "https://example.com/rib.png",
    "https://example.com/rib.jpg",
    "https://example.com/rib.jpeg",
    "https://example.com/rib.webp",
    "https://example.com/rib.gif",
    "https://example.com/RIB.PNG",
    "https://example.com/rib.png?v=2",
  ])("retourne true pour une extension image reconnue : %s (CA5)", (url) => {
    expect(isImageUrl(url)).toBe(true);
  });

  it.each([
    "https://example.com/rib.pdf",
    "https://example.com/rib",
    "https://example.com/rib.docx",
  ])("retourne false pour une extension non reconnue : %s (CA6)", (url) => {
    expect(isImageUrl(url)).toBe(false);
  });

  it.each([null, undefined, ""])("retourne false quand l'URL est %s (CA7)", (url) => {
    expect(isImageUrl(url)).toBe(false);
  });
});
