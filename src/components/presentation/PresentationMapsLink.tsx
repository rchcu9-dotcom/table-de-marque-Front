type Props = {
  mapsQuery: string | null;
  lieu?: string | null;
  label: string;
};

export default function PresentationMapsLink({ mapsQuery, lieu, label }: Props) {
  if (!mapsQuery) return null;

  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="presentation-maps-link"
      className="presentation-maps-link"
    >
      {lieu?.trim() || label}
    </a>
  );
}
