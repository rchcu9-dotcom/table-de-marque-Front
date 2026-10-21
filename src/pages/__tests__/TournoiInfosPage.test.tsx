import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import type { PresentationGroupe } from "../../api/presentation";
import type { Edition } from "../../api/types/inscription.types";
import type { PresentationStaticInfo } from "../../config/presentationStaticInfo";
import { EDITION_COMPLETE, buildTournoiInfosGroupes } from "../../../tests/fixtures/tournoiInfos.fixture";

type PresentationState = { data: PresentationGroupe[] | undefined; isLoading: boolean; isError: boolean };

let mockPresentation: PresentationState;
let mockEdition: Edition | null = null;
const STATIC_INFO: PresentationStaticInfo = {
  ville: "Rennes",
  lieu: "Le Blizz",
  clubNom: "RCHC",
  fraisCaution: "",
  formatMatch: "",
};
let mockStaticInfo: PresentationStaticInfo = STATIC_INFO;
let mockLieuUrl = "";

vi.mock("../../hooks/usePresentation", () => ({
  usePresentation: () => mockPresentation,
}));

vi.mock("../../hooks/useInscriptionSession", () => ({
  useInscriptionSession: () => ({ edition: mockEdition }),
}));

// Mocké directement : Vite peut inliner import.meta.env.VITE_TOURNOI_* avant tout stubEnv.
vi.mock("../../config/presentationStaticInfo", () => ({
  getPresentationStaticInfo: () => mockStaticInfo,
  getPresentationLieuUrl: () => mockLieuUrl,
}));

let TournoiInfosPage: typeof import("../TournoiInfosPage").default;

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <span data-testid="location">{`${location.pathname}${location.search}`}</span>
      <button type="button" data-testid="back" onClick={() => navigate(-1)} />
    </>
  );
}

function renderPage(url = "/tournoi/infos") {
  return render(
    <MemoryRouter initialEntries={["/", url]} initialIndex={1}>
      <Routes>
        <Route
          path="/tournoi/infos"
          element={
            <>
              <TournoiInfosPage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/" element={<span data-testid="accueil" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  vi.resetModules();
  mockPresentation = { data: buildTournoiInfosGroupes(), isLoading: false, isError: false };
  mockEdition = EDITION_COMPLETE;
  mockStaticInfo = STATIC_INFO;
  mockLieuUrl = "";
  document.title = "Table de Marque";
  document.documentElement.setAttribute("lang", "fr");
  ({ default: TournoiInfosPage } = await import("../TournoiInfosPage"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TournoiInfosPage — contenu (CA2)", () => {
  it("affiche tous les chapitres sauf Médias, dans l'ordre de l'API", () => {
    renderPage();

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Présentation",
      "Tournoi 5v5",
    ]);
    expect(screen.queryByTestId("tournoi-infos-chapter-Médias")).not.toBeInTheDocument();
    expect(screen.queryByText("Galerie photos du tournoi.")).not.toBeInTheDocument();
  });

  it("exclut l'article YouTube et garde les autres articles dans l'ordre", () => {
    renderPage();

    const chapitre = screen.getByTestId("tournoi-infos-chapter-Présentation");
    expect(within(chapitre).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Résumé",
      "Inscription",
      "Le Blizz",
    ]);
    expect(screen.queryByText("Suivez le live.")).not.toBeInTheDocument();
  });

  it("affiche le chapô, la description longue et les chiffres-clés, tokens résolus", () => {
    renderPage();

    const resume = screen.getByTestId("tournoi-infos-article-Résumé");
    expect(within(resume).getByText("Deux jours de glace à Rennes.")).toBeInTheDocument();
    expect(within(resume).getByText(/^Le tournoi a lieu les 22 mai - 23 mai\.$/)).toBeInTheDocument();
    expect(within(resume).getByText("Inscription : 270 € par équipe.")).toBeInTheDocument();
    const faits = within(resume).getByTestId("tournoi-infos-facts");
    expect(within(faits).getAllByRole("term").map((n) => n.textContent)).toEqual(["16", "16"]);
  });

  it.each(["/tournoi/infos", "/tournoi/infos?lang=en"])(
    "ne laisse aucun {{ dans la page avec une édition et des infos statiques complètes (CA3b) — %s",
    (url) => {
      mockStaticInfo = { ...STATIC_INFO, fraisCaution: "50 €", formatMatch: "2 x 12 min" };
      renderPage(url);

      const page = screen.getByTestId("tournoi-infos-page");
      expect(page.textContent).not.toContain("{{");
      expect(page.textContent).not.toContain("}}");
    },
  );

  it("laisse brut un token sans valeur, sans planter, en l'absence d'édition courante", () => {
    mockEdition = null;
    renderPage();

    const resume = screen.getByTestId("tournoi-infos-article-Résumé");
    expect(within(resume).getByText("Le tournoi a lieu les {{dates}}.")).toBeInTheDocument();
    expect(within(resume).getByText("Inscription : {{fraisInscription}} par équipe.")).toBeInTheDocument();
    // Le token statique, lui, reste résolu.
    expect(within(resume).getByText("Deux jours de glace à Rennes.")).toBeInTheDocument();
  });

  it("n'affiche pas de lien du Résumé vers la page elle-même", () => {
    renderPage();
    expect(
      within(screen.getByTestId("tournoi-infos-article-Résumé")).queryByTestId("tournoi-infos-article-link"),
    ).not.toBeInTheDocument();
  });

  it("affiche l'adresse, la carte et le lien Blizz dans l'article du lieu (CA4)", () => {
    renderPage();

    const lieu = screen.getByTestId("tournoi-infos-article-Le Blizz");
    expect(within(lieu).getByText("Le Blizz, Rennes")).toBeInTheDocument();
    expect(within(lieu).getByTestId("presentation-maps-link")).toHaveTextContent("Voir sur la carte");
    const lien = within(lieu).getByTestId("tournoi-infos-article-link");
    expect(lien).toHaveAttribute("href", "https://www.leblizz.com");
    expect(lien).toHaveAttribute("target", "_blank");
  });

  it("affiche le filet lieuUrl quand l'article du lieu n'a pas de lien vers le site", () => {
    mockLieuUrl = "https://www.leblizz.com";
    mockPresentation.data = buildTournoiInfosGroupes().map((g) => ({
      ...g,
      articles: g.articles.map((a) => (a.titre === "Le Blizz" ? { ...a, lienUrl: null } : a)),
    }));
    renderPage();

    expect(screen.getByTestId("tournoi-infos-lieu-url")).toHaveAttribute("href", "https://www.leblizz.com");
  });

  it("affiche les images de chapitre à l'écran (CA3)", () => {
    mockPresentation.data = buildTournoiInfosGroupes("https://api.example.com/presentation/image/x.png");
    renderPage();

    expect(screen.getAllByTestId("chapter-image")).toHaveLength(2);
  });

  it("affiche le pied de document imprimé", () => {
    renderPage();
    expect(screen.getByTestId("tournoi-infos-print-footer")).toBeInTheDocument();
  });
});

describe("TournoiInfosPage — en-tête et titre", () => {
  it("affiche nomTournoi en h1 et la ligne dates · lieu", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Tournoi RCHC U11" })).toBeInTheDocument();
    expect(screen.getByText("22 mai - 23 mai · Le Blizz")).toBeInTheDocument();
  });

  it("se replie sur un titre par défaut et omet les morceaux non résolus sans édition", () => {
    mockEdition = null;
    mockStaticInfo = { ...STATIC_INFO, lieu: "" };
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Tournoi U11 RCHC" })).toBeInTheDocument();
    const sousTitre = document.querySelector(".tournoi-infos-subtitle");
    expect(sousTitre).toHaveTextContent("Rennes");
    expect(sousTitre?.textContent).not.toContain("{{");
  });

  it("pose document.title puis le restaure au démontage (CA5b)", () => {
    const { unmount } = renderPage();
    expect(document.title).toBe("Tournoi RCHC U11 – Informations 2027");

    unmount();
    expect(document.title).toBe("Table de Marque");
  });

  it("pose un titre anglais en ?lang=en", () => {
    renderPage("/tournoi/infos?lang=en");
    expect(document.title).toBe("Tournoi RCHC U11 – Information 2027");
  });
});

describe("TournoiInfosPage — langue (CA6)", () => {
  it("affiche les textes anglais en ?lang=en, avec repli FR champ par champ (nomEn compris)", () => {
    renderPage("/tournoi/infos?lang=en");

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Presentation",
      "Tournoi 5v5",
    ]);
    expect(screen.getByRole("heading", { level: 3, name: "Summary" })).toBeInTheDocument();
    expect(screen.getByText("Two days on ice in Rennes.")).toBeInTheDocument();
    // descriptionEn vide → texte français.
    expect(screen.getByText("Inscrivez votre équipe en ligne.")).toBeInTheDocument();
    // titreEn vide → titre français.
    expect(screen.getByRole("heading", { level: 3, name: "Format" })).toBeInTheDocument();
    expect(screen.getByTestId("tournoi-infos-pdf")).toHaveTextContent("Download PDF");
    expect(document.documentElement.getAttribute("lang")).toBe("en");
  });

  it.each(["/tournoi/infos", "/tournoi/infos?lang=xx"])("affiche le français pour %s", (url) => {
    renderPage(url);

    expect(screen.getByRole("heading", { level: 2, name: "Présentation" })).toBeInTheDocument();
    expect(screen.getByTestId("tournoi-infos-pdf")).toHaveTextContent("Télécharger en PDF");
    expect(document.documentElement.getAttribute("lang")).toBe("fr");
  });

  it("le toggle met ?lang= à jour sans créer d'entrée d'historique", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("presentation-language-en"));
    expect(screen.getByTestId("location")).toHaveTextContent("/tournoi/infos?lang=en");
    expect(screen.getByRole("heading", { level: 2, name: "Presentation" })).toBeInTheDocument();

    // Retour arrière : l'entrée précédente est l'accueil, pas /tournoi/infos en français.
    fireEvent.click(screen.getByTestId("back"));
    expect(screen.getByTestId("accueil")).toBeInTheDocument();
  });

  it("restaure <html lang> au démontage", () => {
    const { unmount } = renderPage("/tournoi/infos?lang=en");
    unmount();
    expect(document.documentElement.getAttribute("lang")).toBe("fr");
  });
});

describe("TournoiInfosPage — états et impression", () => {
  it("affiche « Chargement… » et désactive le bouton PDF pendant le chargement", () => {
    mockPresentation = { data: undefined, isLoading: true, isError: false };
    renderPage();

    expect(screen.getByTestId("tournoi-infos-loading")).toHaveTextContent("Chargement...");
    expect(screen.getByTestId("tournoi-infos-pdf")).toBeDisabled();
    expect(screen.queryByTestId("tournoi-infos-print-footer")).not.toBeInTheDocument();
  });

  it("affiche un message d'erreur et désactive le bouton PDF en cas d'erreur", () => {
    mockPresentation = { data: undefined, isLoading: false, isError: true };
    renderPage();

    expect(screen.getByTestId("tournoi-infos-error")).toHaveTextContent(
      "Informations du tournoi indisponibles pour le moment.",
    );
    expect(screen.getByTestId("tournoi-infos-pdf")).toBeDisabled();
  });

  it("affiche un message quand tout le contenu est filtré", () => {
    mockPresentation.data = buildTournoiInfosGroupes().filter((g) => g.nom === "Médias");
    renderPage();

    expect(screen.getByTestId("tournoi-infos-empty")).toHaveTextContent(
      "Aucune information publiée pour le moment.",
    );
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });

  it("le bouton « Télécharger en PDF » appelle window.print() (CA5)", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderPage();

    const bouton = screen.getByTestId("tournoi-infos-pdf");
    expect(bouton).toBeEnabled();
    fireEvent.click(bouton);
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("place la page dans le scope .tournoi-infos, sans aucun sponsor", () => {
    renderPage();

    expect(screen.getByTestId("tournoi-infos-page")).toHaveClass("tournoi-infos");
    expect(screen.queryByTestId("sponsor-footer")).not.toBeInTheDocument();
  });
});
