type Props = {
  labels: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  navLabel: string;
};

/**
 * La .rail de la maquette : de discrètes pastilles à droite, une par panneau,
 * masquées sous 720 px. Volontairement pas une liste de liens à gauche — ce
 * n'est pas une table des matières, juste un repère de position.
 */
export default function PresentationRailNav({
  labels,
  activeIndex,
  onSelect,
  navLabel,
}: Props) {
  if (labels.length <= 1) return null;

  return (
    <nav className="presentation-rail" aria-label={navLabel} data-testid="presentation-rail-nav">
      {labels.map((label, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          aria-current={index === activeIndex ? "true" : "false"}
          aria-label={label}
        />
      ))}
    </nav>
  );
}
