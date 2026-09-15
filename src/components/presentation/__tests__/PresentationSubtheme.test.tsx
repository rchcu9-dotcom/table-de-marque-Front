import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PresentationSubtheme from "../PresentationSubtheme";
import type { ArticlePresentation } from "../../../api/presentation";

const baseArticle: ArticlePresentation = {
  groupe: "Présentation",
  groupeEn: "Presentation",
  surtitre: "Résumé",
  surtitreEn: "Summary",
  titre: "Bienvenue",
  titreEn: "Welcome",
  description: "Le tournoi arrive à {{ville}}.",
  descriptionEn: "The tournament is coming to {{ville}}.",
  faits: "",
  faitsEn: "",
  titreAccroche: "", titreAccrocheEn: "", descriptionCourte: "", descriptionCourteEn: "",
  imageUrl: null,
  lienUrl: "https://example.com",
  lieu: null,
  mapsQuery: null,
};

function renderSubtheme(props: Partial<React.ComponentProps<typeof PresentationSubtheme>> = {}) {
  return render(
    <MemoryRouter>
      <PresentationSubtheme
        article={baseArticle}
        tokens={{ ville: "Cergy" }}
        lang="fr"
        isActive
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("PresentationSubtheme", () => {
  it("falls back to titre/description as the headline/lede while titreAccroche/descriptionCourte are unset", () => {
    renderSubtheme();

    expect(screen.getByText("Bienvenue")).toBeInTheDocument();
    expect(screen.getByText("Le tournoi arrive à Cergy.")).toBeInTheDocument();
  });

  it("resolves {{token}} placeholders in the title and description", () => {
    renderSubtheme();

    expect(screen.getByText("Bienvenue")).toBeInTheDocument();
    expect(screen.getByText("Le tournoi arrive à Cergy.")).toBeInTheDocument();
  });

  it("prefers titreAccroche/descriptionCourte over titre/description once they are filled in, tokens resolved too", () => {
    renderSubtheme({
      article: {
        ...baseArticle,
        titreAccroche: "Le tournoi arrive à {{ville}}.",
        titreAccrocheEn: "The tournament is coming to {{ville}}.",
        descriptionCourte: "Deux jours de glace, un seul objectif.",
        descriptionCourteEn: "Two days on ice, one goal.",
      },
    });

    expect(screen.getByText("Le tournoi arrive à Cergy.")).toBeInTheDocument();
    expect(screen.getByText("Deux jours de glace, un seul objectif.")).toBeInTheDocument();
    expect(screen.queryByText("Bienvenue")).not.toBeInTheDocument();
  });

  it("switches to the English text (also token-resolved) when lang is 'en'", () => {
    renderSubtheme({ lang: "en" });

    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("The tournament is coming to Cergy.")).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
  });

  it("renders the surtitre above the headline, and omits it when empty", () => {
    const { rerender } = renderSubtheme();
    expect(screen.getByText("Résumé")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <PresentationSubtheme
          article={{ ...baseArticle, surtitre: "", surtitreEn: "" }}
          tokens={{ ville: "Cergy" }}
          lang="fr"
          isActive
        />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Résumé")).not.toBeInTheDocument();
  });

  it("renders key figures from the `valeur|libellé` lines, resolving tokens in them", () => {
    renderSubtheme({
      article: { ...baseArticle, faits: "270 €|Par équipe\n{{ville}}|Ville", faitsEn: "" },
    });

    expect(screen.getByText("270 €")).toBeInTheDocument();
    expect(screen.getByText("Par équipe")).toBeInTheDocument();
    expect(screen.getByText("Cergy")).toBeInTheDocument();
  });

  it("renders no facts block when the article has none", () => {
    renderSubtheme();

    expect(screen.queryByTestId("presentation-facts")).not.toBeInTheDocument();
  });

  it("marks itself aria-hidden and non-interactive when not the active subtheme", () => {
    renderSubtheme({ isActive: false });

    const node = screen.getByTestId("presentation-subtheme-Bienvenue");
    expect(node).toHaveAttribute("aria-hidden", "true");
  });

  it("links the CTA to the article's external lienUrl by default", () => {
    renderSubtheme();

    const cta = screen.getByTestId("presentation-subtheme-cta");
    expect(cta).toHaveAttribute("href", "https://example.com");
    expect(cta).toHaveAttribute("target", "_blank");
  });

  it("routes the 'Inscription' article internally to /inscription instead of its lienUrl", () => {
    renderSubtheme({
      article: { ...baseArticle, titre: "Inscription", lienUrl: "https://old-glide-form.example.com" },
    });

    const cta = screen.getByTestId("presentation-subtheme-cta");
    expect(cta).toHaveAttribute("href", "/inscription");
  });

  it("renders no CTA when the article has no lienUrl and is not the Inscription article", () => {
    renderSubtheme({ article: { ...baseArticle, lienUrl: null } });

    expect(screen.queryByTestId("presentation-subtheme-cta")).not.toBeInTheDocument();
  });

  it("shows the maps link only when lieu or mapsQuery is provided", () => {
    const { rerender } = renderSubtheme({ article: { ...baseArticle, lieu: null, mapsQuery: null } });
    expect(screen.queryByTestId("presentation-maps-link")).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <PresentationSubtheme
          article={{ ...baseArticle, lieu: "Cergy", mapsQuery: "48.03,2.03" }}
          tokens={{ ville: "Cergy" }}
          lang="fr"
          isActive
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("presentation-maps-link")).toBeInTheDocument();
  });
});
