import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type {
  CandidatureOrganisateur,
  Edition,
  EditionEtape,
} from '../../api/types/inscription.types';
import { composerMailPorteur, preparerLienMail } from './mailPorteur';

interface BoutonMailPorteurProps {
  candidature: Pick<CandidatureOrganisateur, 'statut' | 'utilisateurEmail'>;
  edition: Edition | null;
  etape: EditionEtape | null;
  /** Ouvre la messagerie en mode long. Remplacé dans les tests : jsdom ne navigue pas. */
  ouvrir?: (href: string) => void;
}

function ouvrirMessagerie(href: string) {
  window.location.href = href;
}

/**
 * Ouvre un brouillon dans la messagerie de l'organisateur : rien ne part du serveur, et le
 * statut de la candidature ne change pas. Dans le cas courant, c'est un simple lien.
 */
export function BoutonMailPorteur({
  candidature,
  edition,
  etape,
  ouvrir = ouvrirMessagerie,
}: BoutonMailPorteurProps) {
  const [copie, setCopie] = useState<'reussie' | 'echouee' | null>(null);
  const zoneTexte = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (copie === 'echouee') zoneTexte.current?.select();
  }, [copie]);

  if (!edition || !candidature.utilisateurEmail?.trim()) return null;

  const mail = composerMailPorteur({
    email: candidature.utilisateurEmail,
    statut: candidature.statut,
    edition,
    etape,
    origine: window.location.origin,
  });
  const { href, texteACopier } = preparerLienMail(mail);

  // La copie passe avant l'ouverture : une fois la messagerie au premier plan, le document
  // n'a plus le focus et le navigateur peut refuser l'écriture dans le presse-papiers.
  async function copierPuisOuvrir(event: MouseEvent, texte: string) {
    event.preventDefault();
    let copieReussie = false;
    try {
      await navigator.clipboard.writeText(texte);
      copieReussie = true;
    } catch {
      // Refus du navigateur, ou API absente : le texte s'affiche sur la carte.
    }
    ouvrir(href);
    setCopie(copieReussie ? 'reussie' : 'echouee');
  }

  return (
    <div className="mt-3">
      <a
        href={href}
        title={mail.objet}
        aria-label={`Mail au porteur : ${mail.objet}`}
        onClick={
          texteACopier === null
            ? undefined
            : (event) => void copierPuisOuvrir(event, texteACopier)
        }
        className="inline-block px-3 py-1.5 rounded border border-slate-600 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
      >
        ✉ Mail au porteur
      </a>
      {copie === 'reussie' && (
        <p role="status" className="text-xs text-green-300 mt-1">
          Texte copié : colle-le dans le mail.
        </p>
      )}
      {copie === 'echouee' && (
        <div className="mt-2 space-y-1">
          <p role="status" className="text-xs text-yellow-300">
            Copie impossible : copie le texte ci-dessous dans le mail.
          </p>
          <textarea
            ref={zoneTexte}
            readOnly
            rows={6}
            value={mail.texte}
            aria-label="Texte du mail"
            className="w-full border border-slate-600 rounded px-2 py-1 text-xs bg-slate-700 text-slate-100"
          />
        </div>
      )}
    </div>
  );
}
