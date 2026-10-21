import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TournoiInfosArticle from "../TournoiInfosArticle";
import type { ArticlePresentation } from "../../../api/presentation";
import { pickLocalized, type ContentLang } from "../../../utils/presentationContent";
import { resolveTokens, type PresentationTokens } from "../../../utils/presentationTokens";
import { LONG_ARTICLE_THRESHOLD } from "../../../utils/tournoiInfosContent";
import { TOURNOI_INFOS_LABELS } from "../../../utils/tournoiInfosLabels";
import { makeArticle } from "../../../../tests/fixtures/tournoiInfos.fixture";

const TOKENS: PresentationTokens = { ville: "Rennes", dates: "", nbEquipesMax: "16" };

function renderArticle(
  article: ArticlePresentation,
  { lang = "fr", lieuUrl = "" }: { lang?: ContentLang; lieuUrl?: string } = {},
) {
  const t = (fr: string, en: string) => resolveTokens(pickLocalized(lang, fr, en), TOKENS);
  render(
    <MemoryRouter>
      <TournoiInfosArticle
        article={article}
        t={t}
        lang={lang}
        labels={TOURNOI_INFOS_LABELS[lang]}
        lieuUrl={lieuUrl}
      />
    </MemoryRouter>,
  );
  return screen.getByTestId(`tournoi-infos-article-${article.titre}`);
}

describe("TournoiInfosArticle", () => {
  it("affiche le surtitre et le titre (et non le titre choc) en h3", () => {
    const node = renderArticle(
      makeArticle({ surtitre: "Résumé", titre: "Le tournoi", titreAccroche: "Titre choc", description: "x" }),
    );

    expect(within(node).getByText("Résumé")).toBeInTheDocument();
    expect(within(node).getByRole("heading", { level: 3, name: "Le tournoi" })).toBeInTheDocument();
    expect(within(node).queryByText("Titre choc")).not.toBeInTheDocument();
  });

  it("affiche le chapô puis la description longue, un paragraphe par bloc (CA2)", () => {
    const node = renderArticle(
      makeArticle({
        titre: "Résumé",
        descriptionCourte: "Deux jours à {{ville}}.",
        description: "Premier bloc\nsuite du bloc\n\nSecond bloc",
      }),
    );

    const paragraphes = node.querySelectorAll("p");
    expect(paragraphes[0]).toHaveTextContent("Deux jours à Rennes.");
    expect(paragraphes[0]).toHaveClass("tournoi-infos-chapo");
    expect(node.querySelectorAll(".tournoi-infos-paragraph")).toHaveLength(2);
    expect(node.querySelectorAll(".tournoi-infos-paragraph")[0].textContent).toBe("Premier bloc\nsuite du bloc");
  });

  it("donne exactement 2 paragraphes pour deux blocs séparés par une ligne vide, retours simples conservés (CA9)", () => {
    const node = renderArticle(makeArticle({ titre: "Règlement", description: "bloc 1 ligne a\nligne b\n\nbloc 2" }));

    const paragraphes = node.querySelectorAll("p.tournoi-infos-paragraph");
    expect(paragraphes).toHaveLength(2);
    expect(paragraphes[0].textContent).toBe("bloc 1 ligne a\nligne b");
    expect(paragraphes[1].textContent).toBe("bloc 2");
  });

  it("omet le chapô quand il est identique au texte long, aux espaces près", () => {
    const node = renderArticle(
      makeArticle({ titre: "A", descriptionCourte: "Même  texte", description: "Même texte" }),
    );

    expect(node.querySelector(".tournoi-infos-chapo")).toBeNull();
    expect(within(node).getAllByText("Même texte")).toHaveLength(1);
  });

  it("omet le chapô vide", () => {
    const node = renderArticle(makeArticle({ titre: "A", descriptionCourte: "   ", description: "Long" }));
    expect(node.querySelector(".tournoi-infos-chapo")).toBeNull();
  });

  it("résout les tokens qui ont une valeur et laisse brut un token sans valeur (CA2)", () => {
    const node = renderArticle(makeArticle({ titre: "A", description: "À {{ville}}, les {{dates}}." }));
    expect(within(node).getByText("À Rennes, les {{dates}}.")).toBeInTheDocument();
  });

  it("affiche les chiffres-clés en liste de définitions, tokens résolus", () => {
    const node = renderArticle(makeArticle({ titre: "A", faits: "{{nbEquipesMax}}|Équipes\n2|Jours" }));

    const dl = within(node).getByTestId("tournoi-infos-facts");
    expect(dl.tagName).toBe("DL");
    expect(dl).toHaveAttribute("aria-label", "Chiffres clés");
    expect(within(dl).getAllByRole("term").map((n) => n.textContent)).toEqual(["16", "2"]);
    expect(within(dl).getAllByRole("definition").map((n) => n.textContent)).toEqual(["Équipes", "Jours"]);
  });

  it("n'affiche pas de bloc chiffres-clés sans faits", () => {
    const node = renderArticle(makeArticle({ titre: "A" }));
    expect(within(node).queryByTestId("tournoi-infos-facts")).not.toBeInTheDocument();
  });

  it("affiche en anglais avec repli FR champ par champ (CA6)", () => {
    const node = renderArticle(
      makeArticle({ titre: "Lieu", titreEn: "Venue", description: "Texte FR seul", descriptionEn: "  " }),
      { lang: "en" },
    );

    expect(within(node).getByRole("heading", { name: "Venue" })).toBeInTheDocument();
    expect(within(node).getByText("Texte FR seul")).toBeInTheDocument();
  });

  describe("bloc lieu (CA4)", () => {
    const lieuArticle = makeArticle({
      titre: "Le Blizz",
      lieu: "Le Blizz, Rennes",
      mapsQuery: "Le Blizz Rennes",
      lienUrl: "https://www.leblizz.com",
    });

    it("affiche l'adresse, « Voir sur la carte » et le lien Blizz, tous deux en nouvel onglet", () => {
      const node = renderArticle(lieuArticle, { lieuUrl: "https://www.leblizz.com" });

      const lieu = within(node).getByTestId("tournoi-infos-lieu");
      expect(within(lieu).getByText("Le Blizz, Rennes")).toBeInTheDocument();
      const carte = within(lieu).getByTestId("presentation-maps-link");
      expect(carte).toHaveTextContent("Voir sur la carte");
      expect(carte).toHaveAttribute("target", "_blank");
      expect(carte).toHaveAttribute("href", expect.stringContaining("query=Le%20Blizz%20Rennes"));

      const lien = within(node).getByTestId("tournoi-infos-article-link");
      expect(lien).toHaveAttribute("href", "https://www.leblizz.com");
      expect(lien).toHaveAttribute("target", "_blank");
      expect(lien).toHaveAttribute("rel", "noopener noreferrer");
      expect(lien).toHaveTextContent("www.leblizz.com");
    });

    it("n'ajoute pas le filet lieuUrl quand le lien de l'article pointe déjà sur le même site", () => {
      const node = renderArticle(lieuArticle, { lieuUrl: "http://leblizz.com" });
      expect(within(node).queryByTestId("tournoi-infos-lieu-url")).not.toBeInTheDocument();
    });

    it("ajoute le filet lieuUrl quand l'article n'a pas de lien vers le site du lieu", () => {
      const node = renderArticle(
        { ...lieuArticle, lienUrl: null },
        { lieuUrl: "https://www.leblizz.com" },
      );

      const filet = within(node).getByTestId("tournoi-infos-lieu-url");
      expect(filet).toHaveAttribute("href", "https://www.leblizz.com");
      expect(filet).toHaveAttribute("target", "_blank");
      expect(filet).toHaveTextContent("www.leblizz.com");
    });

    it("n'affiche pas de filet sans lieuUrl configuré", () => {
      const node = renderArticle({ ...lieuArticle, lienUrl: null }, { lieuUrl: "" });
      expect(within(node).queryByTestId("tournoi-infos-lieu-url")).not.toBeInTheDocument();
    });

    it("article « Lieu » avec un lien saisi « Http:// » : domaine en libellé, href inchangé, nouvel onglet, pas de filet en doublon (CA4, CA8, CA10)", () => {
      const node = renderArticle(
        { ...lieuArticle, titre: "Lieu", lienUrl: "Http://www.leblizz.com" },
        { lieuUrl: "https://www.leblizz.com" },
      );

      const lien = within(node).getByTestId("tournoi-infos-article-link");
      expect(lien).toHaveTextContent("www.leblizz.com");
      expect(lien).toHaveAttribute("href", "Http://www.leblizz.com");
      expect(lien).toHaveAttribute("target", "_blank");
      expect(lien).toHaveAttribute("rel", "noopener noreferrer");
      expect(within(node).queryByTestId("tournoi-infos-lieu-url")).not.toBeInTheDocument();
      expect(within(node).getAllByRole("link", { name: /leblizz/ })).toHaveLength(1);
    });

    it("garde le libellé « Voir sur la carte » même si lieu a été saisi en coordonnées GPS (C2)", () => {
      const node = renderArticle({
        ...lieuArticle,
        lieu: "48.132705,-1.650878",
        mapsQuery: "48.1325548,-1.6508351",
      });

      const carte = within(node).getByTestId("presentation-maps-link");
      expect(carte).toHaveTextContent("Voir sur la carte");
      expect(carte).not.toHaveTextContent("48.13");
      expect(carte).toHaveAttribute("href", expect.stringContaining("query=48.1325548%2C-1.6508351"));
    });

    it("libellé de carte en anglais", () => {
      const node = renderArticle(lieuArticle, { lang: "en" });
      expect(within(node).getByTestId("presentation-maps-link")).toHaveTextContent("View on map");
    });

    it("n'affiche pas de bloc lieu sans adresse ni mapsQuery", () => {
      const node = renderArticle(makeArticle({ titre: "A" }), { lieuUrl: "https://www.leblizz.com" });
      expect(within(node).queryByTestId("tournoi-infos-lieu")).not.toBeInTheDocument();
    });

    it("affiche l'adresse seule sans lien de carte quand mapsQuery est absent", () => {
      const node = renderArticle(makeArticle({ titre: "A", lieu: "Rennes" }));
      expect(within(node).getByTestId("tournoi-infos-lieu")).toHaveTextContent("Rennes");
      expect(within(node).queryByTestId("presentation-maps-link")).not.toBeInTheDocument();
    });
  });

  describe("filet « Site du lieu » (VITE_TOURNOI_LIEU_URL, spec de saisie §2.2)", () => {
    const BLIZZ = "https://www.leblizz.com";
    const porteur = (lienUrl: string | null, titre = "Résumé") =>
      makeArticle({ titre, lieu: "Patinoire du Blizz, Rennes", mapsQuery: "48.13,-1.65", lienUrl });

    it("préfixe le lien par « Site du lieu : » en français (D1)", () => {
      const node = renderArticle(porteur(null), { lieuUrl: BLIZZ });

      const filet = within(node).getByTestId("tournoi-infos-lieu-site");
      expect(filet).toHaveTextContent("Site du lieu : www.leblizz.com");
      // Préfixe hors du lien : le nom accessible du lien reste le domaine.
      const lien = within(filet).getByTestId("tournoi-infos-lieu-url");
      expect(lien).toHaveAccessibleName("www.leblizz.com");
      expect(lien).toHaveAttribute("href", BLIZZ);
      expect(lien).toHaveAttribute("target", "_blank");
      expect(lien).toHaveAttribute("rel", "noopener noreferrer");
      expect(lien).not.toHaveAttribute("data-print-url");
    });

    it("utilise une espace insécable avant les deux-points en français", () => {
      const node = renderArticle(porteur(null), { lieuUrl: BLIZZ });
      expect(within(node).getByTestId("tournoi-infos-lieu-site").textContent).toContain("Site du lieu :");
    });

    it("préfixe le lien par « Venue website: » en anglais (D1)", () => {
      const node = renderArticle(porteur(null), { lieuUrl: BLIZZ, lang: "en" });
      expect(within(node).getByTestId("tournoi-infos-lieu-site")).toHaveTextContent("Venue website: www.leblizz.com");
    });

    it("cas réel K1 : le porteur du lieu pointe vers /tournoi/infos → pas de lien d'article (auto-lien), mais le filet s'affiche (CA2)", () => {
      const node = renderArticle(porteur("/tournoi/infos"), { lieuUrl: BLIZZ });

      expect(within(node).queryByTestId("tournoi-infos-article-link")).not.toBeInTheDocument();
      expect(within(node).getByTestId("tournoi-infos-lieu-url")).toHaveAttribute("href", BLIZZ);
    });

    it("porteur du lieu vers un autre lien interne → lien d'article et filet tous deux affichés (CA2)", () => {
      const node = renderArticle(porteur("/inscription", "Accès"), { lieuUrl: BLIZZ });

      expect(within(node).getByTestId("tournoi-infos-article-link")).toHaveAttribute("href", "/inscription");
      expect(within(node).getByTestId("tournoi-infos-lieu-url")).toHaveAttribute("href", BLIZZ);
    });

    it("porteur du lieu vers un autre site → les deux liens s'affichent (R2, deux liens acceptés)", () => {
      const node = renderArticle(porteur("https://rennes.fr/blizz", "Accès"), { lieuUrl: BLIZZ });

      expect(within(node).getByTestId("tournoi-infos-article-link")).toHaveTextContent("rennes.fr");
      expect(within(node).getByTestId("tournoi-infos-lieu-url")).toHaveTextContent("www.leblizz.com");
    });

    it.each(["https://leblizz.com", "Http://www.leblizz.com/", "https://WWW.LEBLIZZ.COM/acces"])(
      "lienUrl déjà vers le Blizz (%s) → un seul lien Blizz, pas de filet (CA2)",
      (lienUrl) => {
        const node = renderArticle(porteur(lienUrl, "Lieu"), { lieuUrl: BLIZZ });

        expect(within(node).queryByTestId("tournoi-infos-lieu-site")).not.toBeInTheDocument();
        expect(within(node).getAllByRole("link", { name: /leblizz/i })).toHaveLength(1);
      },
    );

    it("lieuUrl vide (variable absente ou invalide après filtrage) → aucun filet (CA2)", () => {
      const node = renderArticle(porteur("/tournoi/infos"), { lieuUrl: "" });
      expect(within(node).queryByTestId("tournoi-infos-lieu-site")).not.toBeInTheDocument();
    });

    it("pas de filet sur un article qui ne porte pas le lieu", () => {
      const node = renderArticle(makeArticle({ titre: "Format", description: "x" }), { lieuUrl: BLIZZ });
      expect(within(node).queryByTestId("tournoi-infos-lieu-site")).not.toBeInTheDocument();
    });

    it("le filet est placé dans le bloc lieu, après « Voir sur la carte »", () => {
      const node = renderArticle(porteur(null), { lieuUrl: BLIZZ });

      const lieu = within(node).getByTestId("tournoi-infos-lieu");
      const carte = within(lieu).getByTestId("presentation-maps-link");
      const filet = within(lieu).getByTestId("tournoi-infos-lieu-site");
      expect(carte.compareDocumentPosition(filet) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe("lien de l'article", () => {
    it("n'affiche pas de lien vers la page elle-même (Résumé → /tournoi/infos)", () => {
      const node = renderArticle(makeArticle({ titre: "Résumé", lienUrl: "/tournoi/infos" }));
      expect(within(node).queryByTestId("tournoi-infos-article-link")).not.toBeInTheDocument();
    });

    it("affiche un lien interne « En savoir plus » dans le même onglet", () => {
      const node = renderArticle(makeArticle({ titre: "A", lienUrl: "/tournoi/programme" }), { lang: "en" });

      const lien = within(node).getByTestId("tournoi-infos-article-link");
      expect(lien).toHaveAttribute("href", "/tournoi/programme?lang=en");
      expect(lien).not.toHaveAttribute("target");
      expect(lien).toHaveTextContent("Learn more");
    });

    it("dirige toujours l'article Inscription vers /inscription", () => {
      const node = renderArticle(makeArticle({ titre: "Inscription", lienUrl: "https://glide.example.com" }));
      expect(within(node).getByTestId("tournoi-infos-article-link")).toHaveAttribute("href", "/inscription");
    });

    it("n'affiche aucun lien pour un lienUrl en javascript: (CA8)", () => {
      const node = renderArticle(makeArticle({ titre: "A", lienUrl: "javascript:alert(1)" }));
      expect(within(node).queryByTestId("tournoi-infos-article-link")).not.toBeInTheDocument();
    });

    it("ne résout pas les tokens dans l'URL du lien", () => {
      const node = renderArticle(makeArticle({ titre: "A", lienUrl: "https://example.com/{{ville}}" }));
      expect(within(node).getByTestId("tournoi-infos-article-link")).toHaveAttribute(
        "href",
        "https://example.com/{{ville}}",
      );
    });
  });

  it("marque data-long un article dont la description dépasse le seuil", () => {
    const court = renderArticle(makeArticle({ titre: "Court", description: "x" }));
    expect(court).not.toHaveAttribute("data-long");

    const long = renderArticle(
      makeArticle({ titre: "Long", description: "x".repeat(LONG_ARTICLE_THRESHOLD + 1) }),
    );
    expect(long).toHaveAttribute("data-long", "true");
  });

  it("n'affiche aucune image d'article", () => {
    const node = renderArticle(makeArticle({ titre: "A", imageUrl: "https://img.example.com/a.png" }));
    expect(node.querySelector("img")).toBeNull();
  });
});
