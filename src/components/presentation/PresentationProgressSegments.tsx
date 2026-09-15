type Props = {
  count: number;
  activeIndex: number;
  progressRatio: number;
  onSelect: (index: number) => void;
  label: string;
};

export default function PresentationProgressSegments({
  count,
  activeIndex,
  progressRatio,
  onSelect,
  label,
}: Props) {
  if (count <= 1) return null;

  return (
    <div
      className="presentation-progress"
      data-testid="presentation-progress-segments"
      role="tablist"
      aria-label={label}
    >
      {Array.from({ length: count }, (_, index) => {
        const isPast = index < activeIndex;
        const isActive = index === activeIndex;
        const fillRatio = isPast ? 1 : isActive ? progressRatio : 0;

        return (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`${label} ${index + 1}`}
            onClick={() => onSelect(index)}
            className={`presentation-seg${isActive ? " is-current" : ""}`}
          >
            <i style={{ width: `${fillRatio * 100}%` }} />
          </button>
        );
      })}
    </div>
  );
}
