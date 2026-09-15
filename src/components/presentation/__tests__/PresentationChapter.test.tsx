import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PresentationChapter from "../PresentationChapter";
import type { ArticlePresentation, PresentationGroupe } from "../../../api/presentation";

function makeArticle(titre: string): ArticlePresentation {
  return {
    groupe: "Présentation",
    groupeEn: "Presentation",
    surtitre: `Surtitre ${titre}`,
    surtitreEn: `Eyebrow ${titre}`,
    titre,
    titreEn: titre,
    description: `Texte de ${titre}`,
    descriptionEn: `Text of ${titre}`,
    faits: "",
    faitsEn: "",
    titreAccroche: "", titreAccrocheEn: "", descriptionCourte: "", descriptionCourteEn: "",
    imageUrl: null,
    lienUrl: null,
    lieu: null,
    mapsQuery: null,
  };
}

function makeGroupe(overrides: Partial<PresentationGroupe> = {}): PresentationGroupe {
  return {
    nom: "Présentation",
    nomEn: "Presentation",
    ordre: 0,
    dureeMs: 5000,
    imageUrl: null,
    articles: [makeArticle("Résumé"), makeArticle("Inscription")],
    ...overrides,
  };
}

function renderChapter(props: Partial<React.ComponentProps<typeof PresentationChapter>> = {}) {
  const onNextPanel = vi.fn();
  render(
    <MemoryRouter>
      <PresentationChapter
        groupe={makeGroupe()}
        index={0}
        total={2}
        tokens={{}}
        lang="fr"
        onNextPanel={onNextPanel}
        onVisibleChange={() => {}}
        {...props}
      />
    </MemoryRouter>,
  );
  return { onNextPanel };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PresentationChapter", () => {
  it("renders the chapter label with its position and name", () => {
    renderChapter({ index: 1, total: 4, groupe: makeGroupe({ nom: "Règlement" }) });

    expect(screen.getByText(/Chapitre 2 \/ 4 — Règlement/)).toBeInTheDocument();
  });

  it("only shows the first subtheme as active initially", () => {
    renderChapter();

    expect(screen.getByTestId("presentation-subtheme-Résumé")).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByTestId("presentation-subtheme-Inscription")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders progress segments when the chapter has more than one subtheme", () => {
    renderChapter();

    expect(screen.getByTestId("presentation-progress-segments")).toBeInTheDocument();
  });

  it("moves to the next subtheme when Suivant is clicked before the last one", () => {
    renderChapter();

    fireEvent.click(screen.getByTestId("presentation-next-button"));

    expect(screen.getByTestId("presentation-subtheme-Résumé")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("presentation-subtheme-Inscription")).toHaveAttribute("aria-hidden", "false");
  });

  it("calls onNextPanel instead of advancing once Suivant is clicked on the last subtheme", () => {
    const { onNextPanel } = renderChapter();

    fireEvent.click(screen.getByTestId("presentation-next-button")); // -> Inscription (last)
    fireEvent.click(screen.getByTestId("presentation-next-button")); // last -> next chapter

    expect(onNextPanel).toHaveBeenCalledTimes(1);
  });

  it("renders a neutral fallback and jumps straight to the next chapter when the group has zero subthemes", () => {
    const { onNextPanel } = renderChapter({ groupe: makeGroupe({ articles: [] }) });

    expect(screen.queryByTestId("presentation-progress-segments")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("presentation-next-button"));

    expect(onNextPanel).toHaveBeenCalledTimes(1);
  });

  it("clicking a progress segment jumps directly to that subtheme", () => {
    renderChapter();

    fireEvent.click(screen.getAllByRole("tab")[1]);

    expect(screen.getByTestId("presentation-subtheme-Inscription")).toHaveAttribute("aria-hidden", "false");
  });

  it("reports its visibility changes via onVisibleChange, used to pause auto-advance and sync the rail nav", () => {
    const observed: IntersectionObserverCallback[] = [];
    class FakeIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observed.push(callback);
      }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    const onVisibleChange = vi.fn();

    renderChapter({ index: 2, onVisibleChange });

    const [callback] = observed;
    act(() => {
      callback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(onVisibleChange).toHaveBeenCalledWith(2, false);

    act(() => {
      callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(onVisibleChange).toHaveBeenCalledWith(2, true);
  });

  it("reports itself as visible immediately when IntersectionObserver is unavailable", () => {
    const onVisibleChange = vi.fn();

    renderChapter({ index: 3, onVisibleChange });

    expect(onVisibleChange).toHaveBeenCalledWith(3, true);
  });
});
