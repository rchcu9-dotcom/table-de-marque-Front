import type { Partenaire } from "../../api/partenaire";

interface Props {
  partenaires: Partenaire[];
}

export default function SponsorFooter({ partenaires }: Props) {
  if (!partenaires.length) return null;
  return (
    <div className="mt-8 border-t border-white/10 pt-5 pb-2">
      <p className="text-xs text-center text-slate-500 uppercase tracking-widest mb-4">
        Partenaires officiels
      </p>
      <div className="flex flex-wrap justify-center items-center gap-6 px-4">
        {partenaires.map((p) =>
          p.logoUrl ? (
            <a
              key={p.id}
              href={p.urlSite ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              title={p.nom}
              className="flex-shrink-0"
            >
              <img
                src={p.logoUrl}
                alt={p.nom}
                className="h-10 w-auto object-contain grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </a>
          ) : (
            <a
              key={p.id}
              href={p.urlSite ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {p.nom}
            </a>
          ),
        )}
      </div>
    </div>
  );
}
