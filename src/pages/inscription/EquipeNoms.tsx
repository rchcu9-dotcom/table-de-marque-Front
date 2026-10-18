interface EquipeNomsProps {
  nom: string;
  nomComplet?: string | null;
  className?: string;
}

/**
 * Nom court en ligne principale (le style vient du parent) et, s'il existe,
 * nom complet en dessous, en plus petit.
 */
export function EquipeNoms({ nom, nomComplet, className }: EquipeNomsProps) {
  return (
    <span className={`flex flex-col text-left ${className ?? ''}`}>
      <span>{nom}</span>
      {nomComplet && <span className="text-xs font-normal text-slate-400">{nomComplet}</span>}
    </span>
  );
}
