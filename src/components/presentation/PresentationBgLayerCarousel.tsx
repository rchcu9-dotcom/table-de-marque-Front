type Props = {
  /** Une image par sous-écran, dans l'ordre d'affichage. */
  imageUrls: (string | null)[];
  activeIndex: number;
  /** false tant que le chapitre n'a jamais été visible : ne rien précharger. */
  enabled: boolean;
};

/**
 * Reproduit la .bg-stack de la maquette : un calque empilé par sous-écran, seul
 * l'actif est opaque, le CSS assure le fondu de 1,1 s. Le double dégradé de
 * lisibilité est porté par .presentation-bg-stack::after.
 *
 * Les images sont des liens Google Drive (`/thumbnail?id=...`) : cet endpoint
 * n'est pas un CDN, c'est une route interne non documentée qui renvoie 429 dès
 * qu'on lui envoie trop de requêtes d'un coup sur des fichiers différents (429
 * reproduit et confirmé — cf. docs/specs/decoupler-presentation-du-google-sheet-
 * gerer-en-admin.track.md). Charger les 27 photos du tournoi au premier rendu
 * déclenchait ce throttling : le fond de tous les chapitres restait noir. On ne
 * demande donc que l'image du sous-écran actif + la suivante (préchargement, le
 * temps qu'elle soit prête pour le prochain fondu), et seulement pour le
 * chapitre actuellement visible (`enabled`, piloté par l'IntersectionObserver du
 * chapitre) — au plus 2 requêtes Drive en vol à tout instant sur toute la page.
 */
export default function PresentationBgLayerCarousel({ imageUrls, activeIndex, enabled }: Props) {
  return (
    <div className="presentation-bg-stack" aria-hidden="true">
      {imageUrls.map((url, index) => {
        const shouldLoad = enabled && (index === activeIndex || index === activeIndex + 1);
        return (
          <div
            key={index}
            className={`presentation-bg-layer${index === activeIndex ? " is-active" : ""}`}
            style={shouldLoad && url ? { backgroundImage: `url(${url})` } : undefined}
          />
        );
      })}
    </div>
  );
}
