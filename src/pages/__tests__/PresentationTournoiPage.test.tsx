import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import type { PresentationGroupe } from "../../api/presentation";
import type { Edition } from "../../api/types/inscription.types";
import type { PresentationStaticInfo } from "../../config/presentationStaticInfo";

let mockUsePresentation: () => { data: PresentationGroupe[] | undefined; isLoading: boolean; isError: boolean };
let mockEdition: Edition | null = null;
const EMPTY_STATIC_INFO: PresentationStaticInfo = {
  ville: "",
  lieu: "",
  clubNom: "",
  fraisCaution: "",
  formatMatch: "",
};
let mockStaticInfo: PresentationStaticInfo = EMPTY_STATIC_INFO;

vi.mock("../../hooks/usePresentation", () => ({
  usePresentation: () => mockUsePresentation(),
}));

vi.mock("../../hooks/useInscriptionSession", () => ({
  useInscriptionSession: () => ({ edition: mockEdition }),
}));

// Mocked directly (rather than relying on vi.stubEnv over import.meta.env)
// because this module reads VITE_TOURNOI_* vars that Vite's transform may
// inline ahead of any runtime env stubbing, making stubEnv unreliable here.
vi.mock("../../config/presentationStaticInfo", () => ({
  getPresentationStaticInfo: () => mockStaticInfo,
}));

// import after the mocks are registered
let PresentationTournoiPage: typeof import("../PresentationTournoiPage").default;

beforeEach(async () => {
  vi.resetModules();
  mockEdition = null;
  mockStaticInfo = EMPTY_STATIC_INFO;
  ({ default: PresentationTournoiPage } = await import("../PresentationTournoiPage"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const groupesFixture: PresentationGroupe[] = [
  {
    nom: "Présentation",
    nomEn: "Presentation",
    ordre: 0,
    dureeMs: 5000,
    imageUrl: null,
    articles: [
      {
        groupe: "Présentation",
        groupeEn: "Presentation",
        titre: "Résumé",
        titreEn: "Summary",
        description: "Le tournoi arrive à {{ville}}.",
        descriptionEn: "The tournament is coming to {{ville}}.",
        surtitre: "",
        surtitreEn: "",
        faits: "",
        faitsEn: "",
        titreAccroche: "", titreAccrocheEn: "", descriptionCourte: "", descriptionCourteEn: "",
        imageUrl: null,
        lienUrl: null,
        lieu: "Cergy",
        mapsQuery: "48.03,2.03",
      },
      {
        groupe: "Présentation",
        groupeEn: "Presentation",
        titre: "Inscription",
        titreEn: "",
        description: "Inscrivez votre équipe.",
        descriptionEn: "",
        surtitre: "",
        surtitreEn: "",
        faits: "",
        faitsEn: "",
        titreAccroche: "", titreAccrocheEn: "", descriptionCourte: "", descriptionCourteEn: "",
        imageUrl: null,
        lienUrl: "https://old-form.example.com",
        lieu: null,
        mapsQuery: null,
      },
    ],
  },
  {
    nom: "Médias",
    nomEn: "Media",
    ordre: 1,
    dureeMs: 5000,
    imageUrl: null,
    articles: [
      {
        groupe: "Médias",
        groupeEn: "Media",
        titre: "Chaîne YouTube",
        titreEn: "YouTube channel",
        description: "Suivez le live.",
        descriptionEn: "Watch live.",
        surtitre: "",
        surtitreEn: "",
        faits: "",
        faitsEn: "",
        titreAccroche: "", titreAccrocheEn: "", descriptionCourte: "", descriptionCourteEn: "",
        imageUrl: null,
        lienUrl: "https://youtube.com/rchc",
        lieu: null,
        mapsQuery: null,
      },
    ],
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <PresentationTournoiPage />
    </MemoryRouter>,
  );
}

describe("PresentationTournoiPage", () => {
  it("shows a loading state while the presentation content is being fetched", () => {
    mockUsePresentation = () => ({ data: undefined, isLoading: true, isError: false });

    renderPage();

    expect(screen.getByTestId("presentation-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("presentation-page")).not.toBeInTheDocument();
  });

  it("shows an error state when the presentation content fails to load", () => {
    mockUsePresentation = () => ({ data: undefined, isLoading: false, isError: true });

    renderPage();

    expect(screen.getByTestId("presentation-error")).toBeInTheDocument();
    expect(screen.queryByTestId("presentation-page")).not.toBeInTheDocument();
  });

  it("renders every group returned by the API as a chapter, in the order received", () => {
    mockUsePresentation = () => ({ data: groupesFixture, isLoading: false, isError: false });

    renderPage();

    expect(screen.getByTestId("presentation-page")).toBeInTheDocument();
    expect(screen.getByTestId("presentation-chapter-Présentation")).toBeInTheDocument();
    expect(screen.getByTestId("presentation-chapter-Médias")).toBeInTheDocument();
  });

  it("renders the rail nav when there is more than one chapter", () => {
    mockUsePresentation = () => ({ data: groupesFixture, isLoading: false, isError: false });

    renderPage();

    expect(screen.getByTestId("presentation-rail-nav")).toBeInTheDocument();
  });

  it("renders one rail dot per panel, the outro included", () => {
    mockUsePresentation = () => ({ data: [groupesFixture[0]], isLoading: false, isError: false });

    renderPage();

    // Un seul chapitre, mais l'outro reste un panneau à part entière.
    const rail = screen.getByTestId("presentation-rail-nav");
    expect(within(rail).getAllByRole("button")).toHaveLength(2);
  });

  it("resolves {{token}} placeholders from the current edition and static config inside the active subtheme", () => {
    mockStaticInfo = { ...EMPTY_STATIC_INFO, ville: "Cergy" };
    mockUsePresentation = () => ({ data: groupesFixture, isLoading: false, isError: false });

    renderPage();

    expect(screen.getByText("Le tournoi arrive à Cergy.")).toBeInTheDocument();
  });

  it("leaves a placeholder untouched (rather than throwing) when no static config is configured", () => {
    mockUsePresentation = () => ({ data: groupesFixture, isLoading: false, isError: false });

    expect(() => renderPage()).not.toThrow();
    expect(screen.getByText("Le tournoi arrive à {{ville}}.")).toBeInTheDocument();
  });

  it("handles a chapter with zero subthemes without crashing", () => {
    mockUsePresentation = () => ({
      data: [{ nom: "Médias", nomEn: "Media", ordre: 0, dureeMs: 5000, imageUrl: null, articles: [] }],
      isLoading: false,
      isError: false,
    });

    expect(() => renderPage()).not.toThrow();
    expect(screen.getByTestId("presentation-chapter-Médias")).toBeInTheDocument();
  });

  it("clicking a rail nav entry scrolls to the matching chapter section", () => {
    mockUsePresentation = () => ({ data: groupesFixture, isLoading: false, isError: false });
    const scrollIntoViewMock = vi.fn();
    (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = scrollIntoViewMock;

    renderPage();

    act(() => {
      // Le rail est fait de pastilles sans texte : on passe par leur nom accessible.
      fireEvent.click(
        within(screen.getByTestId("presentation-rail-nav")).getByRole("button", {
          name: "Médias",
        }),
      );
    });

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  describe("navigation chapitres / sous-écrans", () => {
    const twoMultiScreenChapters = (): PresentationGroupe[] => [
      groupesFixture[0],
      {
        ...groupesFixture[1],
        articles: [
          groupesFixture[1].articles[0],
          { ...groupesFixture[1].articles[0], titre: "Photos", titreEn: "Photos" },
        ],
      },
    ];

    // IntersectionObserver piloté à la main, indexé par l'id du panneau observé.
    function stubIntersectionObserver() {
      const callbacks = new Map<string, IntersectionObserverCallback>();
      class FakeIntersectionObserver {
        constructor(private callback: IntersectionObserverCallback) {}
        observe = (el: Element) => callbacks.set(el.id, this.callback);
        disconnect = vi.fn();
        unobserve = vi.fn();
      }
      vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
      return (id: string, isIntersecting: boolean) =>
        act(() => {
          callbacks.get(id)!([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
        });
    }

    function isShown(titre: string) {
      return screen.getByTestId(`presentation-subtheme-${titre}`).getAttribute("aria-hidden") === "false";
    }

    it("the explicit pause is global: pausing from one chapter pauses every chapter (CA16)", () => {
      mockUsePresentation = () => ({ data: twoMultiScreenChapters(), isLoading: false, isError: false });
      renderPage();

      const [first, second] = screen.getAllByTestId("presentation-autoplay-toggle");
      expect(first).toHaveAttribute("aria-pressed", "false");
      expect(second).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(first);
      expect(first).toHaveAttribute("aria-pressed", "true");
      expect(second).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(second);
      expect(first).toHaveAttribute("aria-pressed", "false");
      expect(second).toHaveAttribute("aria-pressed", "false");
    });

    it("←/→ only drive the active chapter (CA11)", () => {
      const setVisible = stubIntersectionObserver();
      mockUsePresentation = () => ({ data: twoMultiScreenChapters(), isLoading: false, isError: false });
      renderPage();

      setVisible("presentation-panneau-0", true);
      fireEvent.keyDown(document, { key: "ArrowRight" });
      expect(isShown("Inscription")).toBe(true);
      expect(isShown("Chaîne YouTube")).toBe(true);

      setVisible("presentation-panneau-0", false);
      setVisible("presentation-panneau-1", true);
      fireEvent.keyDown(document, { key: "ArrowRight" });
      expect(isShown("Photos")).toBe(true);
      expect(isShown("Inscription")).toBe(true);
    });

    it("←/→ are ignored when the outro panel is active (CA12)", () => {
      const setVisible = stubIntersectionObserver();
      mockUsePresentation = () => ({ data: twoMultiScreenChapters(), isLoading: false, isError: false });
      renderPage();

      setVisible("presentation-panneau-2", true);
      const event = new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true });
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(isShown("Résumé")).toBe(true);
      expect(isShown("Chaîne YouTube")).toBe(true);
    });

    it("↓ on the last chapter scrolls to the outro panel (CA3)", () => {
      mockUsePresentation = () => ({ data: twoMultiScreenChapters(), isLoading: false, isError: false });
      const scrollIntoViewMock = vi.fn();
      (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = scrollIntoViewMock;
      renderPage();

      const lastChapter = screen.getByTestId("presentation-chapter-Médias");
      fireEvent.click(within(lastChapter).getByTestId("presentation-next-button"));

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      expect(scrollIntoViewMock.mock.contexts[0]).toBe(screen.getByTestId("presentation-outro"));
      expect(within(screen.getByTestId("presentation-outro")).queryByTestId("presentation-next-button")).toBeNull();
    });

    it("↓ on the first chapter scrolls to the second one, whatever the active subscreen (CA1)", () => {
      mockUsePresentation = () => ({ data: twoMultiScreenChapters(), isLoading: false, isError: false });
      const scrollIntoViewMock = vi.fn();
      (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = scrollIntoViewMock;
      renderPage();

      const firstChapter = screen.getByTestId("presentation-chapter-Présentation");
      fireEvent.click(within(firstChapter).getByTestId("presentation-next-button"));

      expect(scrollIntoViewMock.mock.contexts[0]).toBe(screen.getByTestId("presentation-chapter-Médias"));
      expect(isShown("Résumé")).toBe(true);
    });
  });

  it("switches the active subtheme text to English via the language toggle", () => {
    mockUsePresentation = () => ({ data: groupesFixture, isLoading: false, isError: false });

    renderPage();
    expect(screen.getByText("Le tournoi arrive à {{ville}}.")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("presentation-language-en"));

    expect(screen.getByText("The tournament is coming to {{ville}}.")).toBeInTheDocument();
  });
});
