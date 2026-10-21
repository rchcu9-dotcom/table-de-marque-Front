import { getApiBaseUrl } from "../api/env";

/** Miroir de PRESENTATION_IMAGE_URL_MAX_LENGTH (back: update-presentation-groupe.dto.ts) — colonne VARCHAR(500). */
export const PRESENTATION_IMAGE_URL_MAX_LENGTH = 500;

/** Mêmes messages que le DTO back, pour qu'une erreur locale et une 400 se lisent pareil. */
export const IMAGE_URL_TOO_LONG_MESSAGE = "L'URL de l'image ne doit pas dépasser 500 caractères.";
export const IMAGE_URL_SCHEME_MESSAGE = "L'URL de l'image doit commencer par http:// ou https://.";

const HTTP_URL_REGEX = /^https?:\/\/\S+$/i;

/**
 * Règle du back (UpdatePresentationGroupeDto.imageUrl) appliquée côté front pour un retour
 * immédiat. Une valeur vide est valide : le formulaire l'envoie en `null` (retrait de l'image).
 * Renvoie le message d'erreur, ou `null` si l'URL est acceptable.
 */
export function getPresentationImageUrlError(url: string): string | null {
  const value = url.trim();
  if (!value) return null;
  if (value.length > PRESENTATION_IMAGE_URL_MAX_LENGTH) return IMAGE_URL_TOO_LONG_MESSAGE;
  if (!HTTP_URL_REGEX.test(value)) return IMAGE_URL_SCHEME_MESSAGE;
  return null;
}

export function isValidPresentationImageUrl(url: string): boolean {
  return getPresentationImageUrlError(url) === null;
}

/** Miroir de extractDriveFileId (back: drive-url.util.ts). */
function extractDriveFileId(url: string): string | null {
  const shareMatch = url.match(/\/file\/d\/([^/]+)\//);
  if (shareMatch && shareMatch[1]) return shareMatch[1];

  if (url.includes("drive.google.com/thumbnail")) {
    const idMatch = url.match(/[?&]id=([^&]+)/);
    if (idMatch && idMatch[1]) return idMatch[1];
  }

  return null;
}

/**
 * URL affichable pour l'aperçu admin : un lien de partage Drive n'est pas chargeable tel
 * quel par le navigateur, on passe donc par le relais public du back (comme GET /presentation).
 */
export function toPreviewImageUrl(url: string): string | null {
  const value = url.trim();
  if (!value || !isValidPresentationImageUrl(value)) return null;
  const fileId = extractDriveFileId(value);
  return fileId
    ? `${getApiBaseUrl()}/presentation/image/${encodeURIComponent(fileId)}?w=400`
    : value;
}
