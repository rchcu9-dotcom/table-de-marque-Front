type Props = {
  count: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
};

/**
 * Chevrons ‹ / › de navigation entre sous-écrans (pointeur fin uniquement, via CSS).
 * Rendus dans la ligne de progression et affichés au-dessus des traits (via CSS
 * order) : ancrés à la barre, ils ne « bougent » plus d'un chapitre à l'autre, et
 * le › s'aligne sur le bord droit de la barre, rail des chapitres présent ou non.
 * Aux bornes : aria-disabled sans l'attribut natif disabled, pour que le focus
 * clavier ne retombe pas sur body quand on atteint la borne.
 */
export default function PresentationSubscreenNav({
  count,
  canPrev,
  canNext,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
}: Props) {
  if (count <= 1) return null;

  return (
    <div className="presentation-subnav" data-testid="presentation-subscreen-nav">
      <button
        type="button"
        aria-label={prevLabel}
        aria-disabled={!canPrev}
        onClick={() => {
          if (canPrev) onPrev();
        }}
        data-testid="presentation-prev-screen"
        className="presentation-subnav-btn is-prev"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={nextLabel}
        aria-disabled={!canNext}
        onClick={() => {
          if (canNext) onNext();
        }}
        data-testid="presentation-next-screen"
        className="presentation-subnav-btn is-next"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
