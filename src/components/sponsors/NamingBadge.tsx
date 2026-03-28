import type { Partenaire } from "../../api/partenaire";

interface Props {
  partner: Partenaire;
}

export default function NamingBadge({ partner }: Props) {
  const inner = (
    <span className="inline-flex items-center gap-1.5">
      {partner.logoUrl && (
        <img
          src={partner.logoUrl}
          alt={partner.nom}
          className="h-4 w-auto object-contain opacity-70"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <span className="text-xs text-slate-400 font-normal">{partner.nom}</span>
    </span>
  );

  if (partner.urlSite) {
    return (
      <a
        href={partner.urlSite}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-0.5 hover:opacity-80 transition-opacity"
      >
        {inner}
      </a>
    );
  }
  return <span className="block mt-0.5">{inner}</span>;
}
