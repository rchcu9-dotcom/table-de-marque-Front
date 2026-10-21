import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import type { ContentLang } from "../utils/presentationContent";
import { parseContentLang } from "../utils/tournoiInfosContent";

/**
 * Langue de contenu portée par l'URL (`?lang=fr|en`, `fr` par défaut) : un lien partagé
 * ou un rechargement conserve la langue. Changer de langue remplace l'entrée d'historique
 * plutôt que d'en empiler une par clic. Synchronise aussi <html lang> (lecteurs d'écran,
 * césure à l'impression), restauré en quittant la page.
 */
export function useContentLangParam(): [ContentLang, (lang: ContentLang) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const lang = parseContentLang(searchParams.get("lang"));

  const setLang = useCallback(
    (next: ContentLang) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set("lang", next);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("lang");
    root.setAttribute("lang", lang);
    return () => {
      if (previous === null) root.removeAttribute("lang");
      else root.setAttribute("lang", previous);
    };
  }, [lang]);

  return [lang, setLang];
}
