import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TournoiInfosChapter from "../TournoiInfosChapter";
import type { PresentationGroupe } from "../../../api/presentation";
import { pickLocalized, type ContentLang } from "../../../utils/presentationContent";
import { TOURNOI_INFOS_LABELS } from "../../../utils/tournoiInfosLabels";
import { makeArticle, makeGroupe } from "../../../../tests/fixtures/tournoiInfos.fixture";

function renderChapter(groupe: PresentationGroupe, lang: ContentLang = "fr", index = 0) {
  render(
    <MemoryRouter>
      <TournoiInfosChapter
        groupe={groupe}
        index={index}
        t={(fr, en) => pickLocalized(lang, fr, en)}
        lang={lang}
        labels={TOURNOI_INFOS_LABELS[lang]}
        lieuUrl=""
      />
    </MemoryRouter>,
  );
  return screen.getByTestId(`tournoi-infos-chapter-${groupe.nom}`);
}

describe("TournoiInfosChapter", () => {
  const groupe = makeGroupe(
    "Présentation",
    [makeArticle({ titre: "Résumé" }), makeArticle({ titre: "Lieu" })],
    { nomEn: "Presentation", imageUrl: "https://api.example.com/presentation/image/a.png" },
  );

  it("rend une section libellée par son h2, avec ses articles dans l'ordre", () => {
    const section = renderChapter(groupe, "fr", 2);

    expect(section.tagName).toBe("SECTION");
    const h2 = within(section).getByRole("heading", { level: 2, name: "Présentation" });
    expect(h2).toHaveAttribute("id", "tournoi-infos-chapitre-2");
    expect(section).toHaveAttribute("aria-labelledby", "tournoi-infos-chapitre-2");
    expect(within(section).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Résumé",
      "Lieu",
    ]);
  });

  it("affiche l'image du chapitre en bandeau décoratif, chargée en différé (CA3)", () => {
    const section = renderChapter(groupe);

    const image = within(section).getByTestId("chapter-image");
    expect(image).toHaveAttribute("src", "https://api.example.com/presentation/image/a.png");
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveClass("presentation-chapter-image");
  });

  it("retire l'image si elle ne se charge pas", () => {
    const section = renderChapter(groupe);

    fireEvent.error(within(section).getByTestId("chapter-image"));
    expect(within(section).queryByTestId("chapter-image")).not.toBeInTheDocument();
  });

  it("n'affiche pas d'image quand imageUrl est null", () => {
    const section = renderChapter({ ...groupe, imageUrl: null });
    expect(section.querySelector("img")).toBeNull();
  });

  it("affiche le nom anglais, avec repli sur le français si nomEn est vide (CA6)", () => {
    renderChapter(groupe, "en");
    expect(screen.getByRole("heading", { level: 2, name: "Presentation" })).toBeInTheDocument();
  });

  it("se replie sur le nom français quand nomEn est vide", () => {
    renderChapter({ ...groupe, nomEn: "" }, "en");
    expect(screen.getByRole("heading", { level: 2, name: "Présentation" })).toBeInTheDocument();
  });
});
