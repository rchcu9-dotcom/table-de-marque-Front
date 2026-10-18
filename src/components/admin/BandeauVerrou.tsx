import { Link } from 'react-router-dom';

/**
 * Explique pourquoi une page de réglages est en lecture seule (étape de
 * l'édition) et renvoie vers l'accueil admin, seul endroit où l'étape change.
 */
export default function BandeauVerrou({
  message,
  lien = { to: '/admin', label: "Accueil admin" },
}: {
  message: string;
  lien?: { to: string; label: string };
}) {
  return (
    <div
      role="status"
      className="bg-amber-950/40 border border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-200 flex flex-col gap-1"
    >
      <p>{message}</p>
      <Link to={lien.to} className="text-amber-300 hover:text-amber-200 underline self-start">
        {lien.label}
      </Link>
    </div>
  );
}
