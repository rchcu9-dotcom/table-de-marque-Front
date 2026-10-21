import type { ContentLang } from "./presentationContent";

export type ArticleLink =
  /** Navigation SPA, même onglet. */
  | { kind: "internal"; to: string }
  /** Autre site : nouvel onglet, href tel que saisi en admin. */
  | { kind: "external"; href: string }
  /** mailto: / tel: : lien simple, sans nouvel onglet. */
  | { kind: "plain"; href: string };

/**
 * Chemins dont la page lit `?lang` (aujourd'hui seule /tournoi/infos) : on y propage la
 * langue courante. Les autres pages internes sont monolingues, inutile d'y ajouter le paramètre.
 */
export const LANG_AWARE_PATH_PREFIXES: readonly string[] = ["/tournoi"];

const HTTP_SCHEME = /^https?:\/\//i;
const PLAIN_SCHEME = /^(mailto|tel):/i;

function isLangAwarePath(pathname: string): boolean {
  const path = pathname.toLowerCase();
  return LANG_AWARE_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Ajoute `lang` à la requête si absent, en conservant les autres paramètres et l'ancre. */
function withLang(path: string, lang: ContentLang): string {
  const hashIndex = path.indexOf("#");
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const beforeHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const queryIndex = beforeHash.indexOf("?");
  const pathname = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  const params = new URLSearchParams(queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : "");
  if (params.has("lang")) return path;
  params.append("lang", lang);
  return `${pathname}?${params.toString()}${hash}`;
}

function internalLink(path: string, lang: ContentLang): ArticleLink {
  const pathname = path.split(/[?#]/, 1)[0];
  return { kind: "internal", to: isLangAwarePath(pathname) ? withLang(path, lang) : path };
}

/**
 * Traduit un `lienUrl` saisi en admin en lien affichable. Ne jette jamais : une valeur
 * invalide ou un schéma non autorisé (javascript:, data:…) donne simplement « pas de lien ».
 */
export function resolveArticleLink(
  lienUrl: string | null | undefined,
  lang: ContentLang,
  origin: string = window.location.origin,
): ArticleLink | null {
  const value = (lienUrl ?? "").trim();
  if (!value) return null;

  // `//host/...` est une URL absolue sans schéma, pas un chemin interne.
  if (value.startsWith("//")) return { kind: "external", href: value };
  if (value.startsWith("/")) return internalLink(value, lang);

  if (PLAIN_SCHEME.test(value)) return { kind: "plain", href: value };
  if (!HTTP_SCHEME.test(value)) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.origin === origin) {
    return internalLink(`${url.pathname}${url.search}${url.hash}`, lang);
  }
  return { kind: "external", href: value };
}

/** Domaine affiché pour un lien externe (« www.leblizz.com »), repli sur l'URL brute. */
export function linkHostLabel(href: string): string {
  try {
    return new URL(href.startsWith("//") ? `https:${href}` : href).hostname || href;
  } catch {
    return href;
  }
}

function normalizedHost(href: string): string | null {
  try {
    return new URL(href.startsWith("//") ? `https:${href}` : href).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Même site, sans tenir compte de la casse ni du préfixe « www. ». */
export function sameHost(a: string, b: string): boolean {
  const hostA = normalizedHost(a);
  return hostA !== null && hostA === normalizedHost(b);
}
