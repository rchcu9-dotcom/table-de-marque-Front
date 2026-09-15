type Props = {
  onClick: () => void;
  label: string;
};

export default function PresentationNextButton({ onClick, label }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-testid="presentation-next-button"
      className="presentation-next-btn"
    >
      <span className="presentation-pulse" aria-hidden="true" />
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#eef3f8"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5v14" />
        <path d="m19 12-7 7-7-7" />
      </svg>
    </button>
  );
}
