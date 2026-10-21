import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ArticleLink from "../ArticleLink";

function renderInRouter(ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="/tournoi/infos" element={<span data-testid="arrivee">infos</span>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ArticleLink", () => {
  it("rend un lien interne en navigation SPA, dans le même onglet", () => {
    renderInRouter(
      <ArticleLink link={{ kind: "internal", to: "/tournoi/infos?lang=en" }} data-testid="lien" className="cta">
        En savoir plus
      </ArticleLink>,
    );

    const lien = screen.getByTestId("lien");
    expect(lien).toHaveAttribute("href", "/tournoi/infos?lang=en");
    expect(lien).not.toHaveAttribute("target");
    expect(lien).toHaveClass("cta");

    fireEvent.click(lien);
    expect(screen.getByTestId("arrivee")).toBeInTheDocument();
  });

  it("ouvre un lien externe dans un nouvel onglet avec rel=noopener noreferrer (CA8)", () => {
    renderInRouter(
      <ArticleLink link={{ kind: "external", href: "https://www.leblizz.com" }} data-testid="lien">
        www.leblizz.com
      </ArticleLink>,
    );

    const lien = screen.getByTestId("lien");
    expect(lien).toHaveAttribute("href", "https://www.leblizz.com");
    expect(lien).toHaveAttribute("target", "_blank");
    expect(lien).toHaveAttribute("rel", "noopener noreferrer");
    expect(lien).not.toHaveAttribute("data-print-url");
  });

  it("marque un lien externe data-print-url quand printUrl est demandé", () => {
    renderInRouter(
      <ArticleLink link={{ kind: "external", href: "https://www.leblizz.com" }} data-testid="lien" printUrl>
        Site du lieu
      </ArticleLink>,
    );

    expect(screen.getByTestId("lien")).toHaveAttribute("data-print-url", "true");
  });

  it("rend mailto:/tel: en lien simple, sans nouvel onglet ni data-print-url", () => {
    renderInRouter(
      <ArticleLink link={{ kind: "plain", href: "mailto:contact@rchc.fr" }} data-testid="lien" printUrl>
        Écrire
      </ArticleLink>,
    );

    const lien = screen.getByTestId("lien");
    expect(lien).toHaveAttribute("href", "mailto:contact@rchc.fr");
    expect(lien).not.toHaveAttribute("target");
    expect(lien).not.toHaveAttribute("data-print-url");
  });
});
