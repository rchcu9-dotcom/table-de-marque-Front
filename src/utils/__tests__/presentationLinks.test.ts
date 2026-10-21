import { describe, it, expect } from "vitest";
import { linkHostLabel, resolveArticleLink, sameHost } from "../presentationLinks";

const ORIGIN = "https://tournoi.rchc.fr";

describe("resolveArticleLink", () => {
  it.each([null, undefined, "", "   "])("ne donne aucun lien pour %j", (value) => {
    expect(resolveArticleLink(value, "fr", ORIGIN)).toBeNull();
  });

  it("transforme /tournoi/infos en lien interne et y ajoute la langue courante (CA1)", () => {
    expect(resolveArticleLink("/tournoi/infos", "en", ORIGIN)).toEqual({
      kind: "internal",
      to: "/tournoi/infos?lang=en",
    });
    expect(resolveArticleLink("/tournoi/infos", "fr", ORIGIN)).toEqual({
      kind: "internal",
      to: "/tournoi/infos?lang=fr",
    });
  });

  it("supprime les espaces autour de la valeur saisie", () => {
    expect(resolveArticleLink("  /tournoi/infos  ", "fr", ORIGIN)).toEqual({
      kind: "internal",
      to: "/tournoi/infos?lang=fr",
    });
  });

  it("conserve les autres paramètres et l'ancre en ajoutant lang", () => {
    expect(resolveArticleLink("/tournoi/infos?x=1#lieu", "en", ORIGIN)).toEqual({
      kind: "internal",
      to: "/tournoi/infos?x=1&lang=en#lieu",
    });
  });

  it("ne remplace pas un paramètre lang déjà présent", () => {
    expect(resolveArticleLink("/tournoi/infos?lang=fr", "en", ORIGIN)).toEqual({
      kind: "internal",
      to: "/tournoi/infos?lang=fr",
    });
  });

  it("reconnaît le préfixe /tournoi sans tenir compte de la casse", () => {
    expect(resolveArticleLink("/Tournoi/Infos", "en", ORIGIN)).toEqual({
      kind: "internal",
      to: "/Tournoi/Infos?lang=en",
    });
  });

  it("n'ajoute pas lang aux pages internes monolingues (/inscription)", () => {
    expect(resolveArticleLink("/inscription", "en", ORIGIN)).toEqual({
      kind: "internal",
      to: "/inscription",
    });
    // /tournoiX n'est pas sous le préfixe /tournoi.
    expect(resolveArticleLink("/tournoiX", "en", ORIGIN)).toEqual({ kind: "internal", to: "/tournoiX" });
  });

  it("ramène une URL absolue de même origine à son chemin interne", () => {
    expect(resolveArticleLink(`${ORIGIN}/tournoi/infos#lieu`, "en", ORIGIN)).toEqual({
      kind: "internal",
      to: "/tournoi/infos?lang=en#lieu",
    });
  });

  it("garde une URL http(s) d'une autre origine en lien externe, href tel que saisi (CA8)", () => {
    expect(resolveArticleLink("https://www.leblizz.com", "fr", ORIGIN)).toEqual({
      kind: "external",
      href: "https://www.leblizz.com",
    });
    expect(resolveArticleLink("HTTP://example.com/a", "fr", ORIGIN)).toEqual({
      kind: "external",
      href: "HTTP://example.com/a",
    });
  });

  it("accepte le lien Blizz saisi « Http:// » (majuscule) et renvoie le href tel que saisi (C10, CA8)", () => {
    expect(resolveArticleLink("Http://www.leblizz.com", "fr", ORIGIN)).toEqual({
      kind: "external",
      href: "Http://www.leblizz.com",
    });
    expect(resolveArticleLink("  Http://www.leblizz.com  ", "en", ORIGIN)).toEqual({
      kind: "external",
      href: "Http://www.leblizz.com",
    });
  });

  it("ne réécrit pas http en https", () => {
    expect(resolveArticleLink("http://www.leblizz.com", "fr", ORIGIN)).toEqual({
      kind: "external",
      href: "http://www.leblizz.com",
    });
  });

  it("reconnaît MAILTO: en majuscules comme lien simple (§2.2)", () => {
    expect(resolveArticleLink("MAILTO:contact@rchc.fr", "fr", ORIGIN)).toEqual({
      kind: "plain",
      href: "MAILTO:contact@rchc.fr",
    });
  });

  it("traite //host comme une URL externe, pas comme un chemin interne", () => {
    expect(resolveArticleLink("//evil.example.com/x", "fr", ORIGIN)).toEqual({
      kind: "external",
      href: "//evil.example.com/x",
    });
  });

  it("donne un lien simple pour mailto: et tel:", () => {
    expect(resolveArticleLink("mailto:contact@rchc.fr", "fr", ORIGIN)).toEqual({
      kind: "plain",
      href: "mailto:contact@rchc.fr",
    });
    expect(resolveArticleLink("TEL:+33600000000", "fr", ORIGIN)).toEqual({
      kind: "plain",
      href: "TEL:+33600000000",
    });
  });

  it.each(["javascript:alert(1)", "data:text/html,x", "ftp://example.com", "www.leblizz.com", "https://"])(
    "refuse %s (aucun lien, sans lever d'exception)",
    (value) => {
      expect(() => resolveArticleLink(value, "fr", ORIGIN)).not.toThrow();
      expect(resolveArticleLink(value, "fr", ORIGIN)).toBeNull();
    },
  );

  describe("table de résolution §2.1 — lang réservé à /tournoi et /tournoi/… (refac liens internes)", () => {
    it.each([
      // ligne 2 : préfixe /tournoi, lang ajouté seulement s'il est absent
      ["/tournoi", { kind: "internal", to: "/tournoi?lang=en" }],
      ["/tournoi/", { kind: "internal", to: "/tournoi/?lang=en" }],
      ["/tournoi?lang=", { kind: "internal", to: "/tournoi?lang=" }],
      ["/tournoi/infos?lang=fr#lieu", { kind: "internal", to: "/tournoi/infos?lang=fr#lieu" }],
      ["/tournoi/infos?b=2&a=1", { kind: "internal", to: "/tournoi/infos?b=2&a=1&lang=en" }],
      ["/TOURNOI/infos#x", { kind: "internal", to: "/TOURNOI/infos?lang=en#x" }],
      // ligne 3 : autres chemins internes, to inchangé, sans lang
      ["/tournament/5v5", { kind: "internal", to: "/tournament/5v5" }],
      ["/tournoiX/infos", { kind: "internal", to: "/tournoiX/infos" }],
      ["/admin/equipes", { kind: "internal", to: "/admin/equipes" }],
      ["/media/x", { kind: "internal", to: "/media/x" }],
      ["/inscription?step=2#a", { kind: "internal", to: "/inscription?step=2#a" }],
      ["/", { kind: "internal", to: "/" }],
      // ligne 4 : même origine
      [`${ORIGIN}/tournoi/infos?x=1`, { kind: "internal", to: "/tournoi/infos?x=1&lang=en" }],
      [`${ORIGIN}/inscription`, { kind: "internal", to: "/inscription" }],
      // ligne 5 : externes, href brut
      ["//cdn.x/y", { kind: "external", href: "//cdn.x/y" }],
      ["https://tournoi.rchc.fr.evil.com/tournoi/infos", {
        kind: "external",
        href: "https://tournoi.rchc.fr.evil.com/tournoi/infos",
      }],
      ["http://tournoi.rchc.fr/tournoi/infos", { kind: "external", href: "http://tournoi.rchc.fr/tournoi/infos" }],
      // lignes 6 et 7
      ["tel:+33600000000", { kind: "plain", href: "tel:+33600000000" }],
      ["JavaScript:alert(1)", null],
      ["data:text/html;base64,PHA+", null],
    ] as const)("%s (lang=en)", (input, expected) => {
      expect(resolveArticleLink(input, "en", ORIGIN)).toEqual(expected);
    });

    it("conserve les valeurs décodées des autres paramètres quand lang est ajouté", () => {
      const link = resolveArticleLink("/tournoi/infos?q=a%20b&r=%C3%A9", "en", ORIGIN);
      expect(link?.kind).toBe("internal");
      const to = (link as { to: string }).to;
      expect(to.split("?")[0]).toBe("/tournoi/infos");
      const entries: Array<[string, string]> = [];
      new URLSearchParams(to.split("?")[1]).forEach((value, key) => entries.push([key, value]));
      expect(entries).toEqual([
        ["q", "a b"],
        ["r", "é"],
        ["lang", "en"],
      ]);
    });
  });

  it("utilise window.location.origin par défaut", () => {
    expect(resolveArticleLink(`${window.location.origin}/tournoi/infos`, "fr")).toEqual({
      kind: "internal",
      to: "/tournoi/infos?lang=fr",
    });
  });
});

describe("linkHostLabel", () => {
  it("renvoie le nom d'hôte d'une URL", () => {
    expect(linkHostLabel("https://www.leblizz.com/accueil?x=1")).toBe("www.leblizz.com");
  });

  it("accepte une URL sans schéma (//host)", () => {
    expect(linkHostLabel("//www.leblizz.com/a")).toBe("www.leblizz.com");
  });

  it("se replie sur la valeur brute si elle n'est pas une URL", () => {
    expect(linkHostLabel("pas une url")).toBe("pas une url");
  });
});

describe("sameHost", () => {
  it("compare sans tenir compte de www. ni de la casse", () => {
    expect(sameHost("https://www.LeBlizz.com/a", "http://leblizz.com")).toBe(true);
  });

  it("distingue deux hôtes différents", () => {
    expect(sameHost("https://leblizz.com", "https://rennes.fr")).toBe(false);
  });

  it("renvoie false si l'une des valeurs n'est pas une URL", () => {
    expect(sameHost("pas une url", "pas une url")).toBe(false);
    expect(sameHost("https://leblizz.com", "")).toBe(false);
  });
});
