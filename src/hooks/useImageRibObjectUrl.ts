import { useEffect, useState } from 'react';
import { fetchImageRib } from '../api/inscription';

/**
 * Charge l'image RIB (route authentifiée) et expose une object URL utilisable
 * en <img src>, révoquée au démontage ou au changement d'image. Volontairement
 * hors React Query : le cache de requêtes est persisté, et des coordonnées
 * bancaires n'ont rien à y faire. Renvoie null tant que l'image n'est pas
 * chargée, ou si le back refuse l'accès.
 */
export function useImageRibObjectUrl(
  editionId: number,
  imageRibUpdatedAt: string | undefined,
  token: string | null | undefined,
  enabled = true,
): string | null {
  // L'URL chargée est rattachée à la clé de sa requête : une URL d'une autre
  // image (ou d'un autre token) n'est jamais renvoyée, sans setState
  // synchrone dans l'effet pour la remettre à null.
  const requestKey =
    enabled && token ? `${editionId}|${imageRibUpdatedAt ?? ''}|${token}` : null;
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null);

  useEffect(() => {
    if (!requestKey || !token) return;
    let cancelled = false;
    let url: string | null = null;
    fetchImageRib(editionId, imageRibUpdatedAt, token)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setLoaded({ key: requestKey, url });
      })
      .catch(() => {
        // Accès refusé ou réseau : pas d'image plutôt qu'une image cassée.
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [requestKey, editionId, imageRibUpdatedAt, token]);

  return loaded && loaded.key === requestKey ? loaded.url : null;
}
