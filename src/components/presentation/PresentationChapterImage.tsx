import { useState } from "react";
import "../../styles/presentation-chapter-image.css";

type Props = {
  /** groupe.imageUrl tel que renvoyé par fetchPresentation (déjà absolu, repli back compris). */
  src: string | null;
  className?: string;
};

/**
 * Image de chapitre en bandeau, à l'écran seulement (masquée par @media print).
 * Décorative (`alt=""`) : le nom du chapitre est affiché juste dessous. `loading="lazy"`
 * évite de demander toutes les photos Drive d'un coup (429), et une image qui ne se
 * charge pas est retirée plutôt que d'afficher une icône cassée.
 */
export default function PresentationChapterImage({ src, className }: Props) {
  // URL en échec plutôt qu'un booléen : un nouveau `src` est retenté sans effet de bord.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) return null;

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={className ? `presentation-chapter-image ${className}` : "presentation-chapter-image"}
      data-testid="chapter-image"
    />
  );
}
