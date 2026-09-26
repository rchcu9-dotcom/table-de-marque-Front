import type { ContentLang } from "../../utils/presentationContent";

type Props = {
  /** État effectif affiché : pause explicite ou suspension après action manuelle. */
  isPaused: boolean;
  onToggle: () => void;
  lang: ContentLang;
};

/** Contrôle persistant de l'avance automatique (WCAG 2.2.2 Pause, Stop, Hide). */
export default function PresentationPlayPauseButton({ isPaused, onToggle, lang }: Props) {
  const label = isPaused
    ? lang === "fr"
      ? "Reprendre le défilement"
      : "Play slideshow"
    : lang === "fr"
      ? "Mettre en pause le défilement"
      : "Pause slideshow";

  return (
    <button
      type="button"
      aria-pressed={isPaused}
      aria-label={label}
      onClick={onToggle}
      data-testid="presentation-autoplay-toggle"
      className="presentation-autoplay-btn"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        {isPaused ? (
          <path d="M7 4.5v15l12.5-7.5z" />
        ) : (
          <>
            <rect x="6" y="4.5" width="4" height="15" rx="1" />
            <rect x="14" y="4.5" width="4" height="15" rx="1" />
          </>
        )}
      </svg>
    </button>
  );
}
