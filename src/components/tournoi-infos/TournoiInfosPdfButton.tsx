type Props = {
  label: string;
  disabled: boolean;
};

/**
 * Ouvre la boîte d'impression du navigateur : l'utilisateur y choisit « Enregistrer au
 * format PDF ». Pas de génération côté serveur ni de bibliothèque PDF (hors-scope).
 */
export default function TournoiInfosPdfButton({ label, disabled }: Props) {
  return (
    <button
      type="button"
      className="tournoi-infos-pdf no-print"
      onClick={() => window.print()}
      disabled={disabled}
      data-testid="tournoi-infos-pdf"
    >
      {label}
    </button>
  );
}
