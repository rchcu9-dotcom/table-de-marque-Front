import { describe, it, expect, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import { useContentLangParam } from "../useContentLangParam";

function Probe() {
  const [lang, setLang] = useContentLangParam();
  const location = useLocation();
  const navigationType = useNavigationType();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="search">{location.search}</span>
      <span data-testid="nav-type">{navigationType}</span>
      <button onClick={() => setLang("en")}>en</button>
      <button onClick={() => setLang("fr")}>fr</button>
    </div>
  );
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/tournoi/infos" element={<Probe />} />
        <Route path="/ailleurs" element={<span data-testid="ailleurs" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("useContentLangParam", () => {
  beforeEach(() => {
    document.documentElement.setAttribute("lang", "fr");
  });

  it.each([
    ["/tournoi/infos", "fr"],
    ["/tournoi/infos?lang=en", "en"],
    ["/tournoi/infos?lang=EN", "en"],
    ["/tournoi/infos?lang=xx", "fr"],
  ])("lit la langue de %s → %s (CA6)", (url, expected) => {
    renderAt(url);
    expect(screen.getByTestId("lang")).toHaveTextContent(expected);
  });

  it("écrit ?lang= en remplaçant l'entrée d'historique, sans perdre les autres paramètres (CA6)", () => {
    renderAt("/tournoi/infos?x=1");

    act(() => screen.getByText("en").click());

    expect(screen.getByTestId("lang")).toHaveTextContent("en");
    const params = new URLSearchParams(screen.getByTestId("search").textContent ?? "");
    expect(params.get("lang")).toBe("en");
    expect(params.get("x")).toBe("1");
    expect(screen.getByTestId("nav-type")).toHaveTextContent("REPLACE");
  });

  it("synchronise <html lang> avec la langue affichée", () => {
    renderAt("/tournoi/infos?lang=en");
    expect(document.documentElement.getAttribute("lang")).toBe("en");

    act(() => screen.getByText("fr").click());
    expect(document.documentElement.getAttribute("lang")).toBe("fr");
  });

  it("restaure <html lang> au démontage", () => {
    const { unmount } = renderAt("/tournoi/infos?lang=en");
    expect(document.documentElement.getAttribute("lang")).toBe("en");

    unmount();
    expect(document.documentElement.getAttribute("lang")).toBe("fr");
  });

  it("retire l'attribut lang au démontage s'il était absent", () => {
    document.documentElement.removeAttribute("lang");
    const { unmount } = renderAt("/tournoi/infos?lang=en");

    unmount();
    expect(document.documentElement.hasAttribute("lang")).toBe(false);
    document.documentElement.setAttribute("lang", "fr");
  });
});
