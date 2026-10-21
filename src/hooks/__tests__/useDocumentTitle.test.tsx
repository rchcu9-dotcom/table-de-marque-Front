import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDocumentTitle } from "../useDocumentTitle";

describe("useDocumentTitle", () => {
  beforeEach(() => {
    document.title = "Table de Marque";
  });

  it("pose le titre tant que le composant est monté (CA5b)", () => {
    renderHook(() => useDocumentTitle("Tournoi U11 RCHC – Informations 2027"));
    expect(document.title).toBe("Tournoi U11 RCHC – Informations 2027");
  });

  it("met le titre à jour quand il change", () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: "Tournoi – Informations" },
    });

    rerender({ title: "Tournament – Information" });
    expect(document.title).toBe("Tournament – Information");
  });

  it("restaure le titre d'origine au démontage, même après plusieurs changements (CA5b)", () => {
    const { rerender, unmount } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: "A" },
    });
    rerender({ title: "B" });

    unmount();
    expect(document.title).toBe("Table de Marque");
  });
});
