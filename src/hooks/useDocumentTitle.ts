import { useEffect, useRef } from "react";

/**
 * Pose `document.title` tant que le composant est monté (et à chaque changement), puis
 * restaure le titre d'origine au démontage. Sur /tournoi/infos, c'est ce titre que
 * Chrome/Edge proposent comme nom de fichier à l'« Enregistrer au format PDF ».
 */
export function useDocumentTitle(title: string): void {
  const initialTitle = useRef<string | null>(null);

  useEffect(() => {
    initialTitle.current = document.title;
    return () => {
      if (initialTitle.current !== null) document.title = initialTitle.current;
    };
  }, []);

  useEffect(() => {
    document.title = title;
  }, [title]);
}
