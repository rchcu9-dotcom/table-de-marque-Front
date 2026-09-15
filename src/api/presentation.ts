import { getApiBaseUrl } from './env';
import { fetchWithRetry } from './fetchWithRetry';

export type ArticlePresentation = {
  groupe: string;
  groupeEn: string;
  /** Court label rouge au-dessus du titre (« Résumé », « Inscriptions »…). */
  surtitre: string;
  surtitreEn: string;
  titre: string;
  titreEn: string;
  description: string;
  descriptionEn: string;
  /** Chiffres-clés, une par ligne au format `valeur|libellé`. */
  faits: string;
  faitsEn: string;
  /** Titre choc affiché en grand (3-4 mots) — c'est lui, pas `titre`, qui s'affiche sur la page publique. */
  titreAccroche: string;
  titreAccrocheEn: string;
  /** Résumé de 3 lignes max affiché sous le titre choc — c'est lui, pas `description`, qui s'affiche sur la page publique. */
  descriptionCourte: string;
  descriptionCourteEn: string;
  imageUrl: string | null;
  lienUrl: string | null;
  lieu: string | null;
  mapsQuery: string | null;
};

export type PresentationGroupe = {
  nom: string;
  nomEn: string;
  articles: ArticlePresentation[];
  ordre: number;
  dureeMs: number;
  imageUrl: string | null;
};

/**
 * Le back sert les photos (Drive) via son propre relais (`/presentation/image/:id`) plutôt
 * que l'URL Drive elle-même — le navigateur ne peut pas la charger en direct, cf.
 * DriveImageProxyService côté back. Il renvoie donc un chemin relatif à sa propre origine ;
 * comme front et back peuvent être sur des domaines différents, on le rend absolu ici plutôt
 * que de le laisser résoudre (à tort) contre l'origine du front.
 */
function toAbsoluteImageUrl(url: string | null): string | null {
  return url && url.startsWith('/') ? `${getApiBaseUrl()}${url}` : url;
}

function absolutiseImages(groupes: PresentationGroupe[]): PresentationGroupe[] {
  return groupes.map((groupe) => ({
    ...groupe,
    imageUrl: toAbsoluteImageUrl(groupe.imageUrl),
    articles: groupe.articles.map((article) => ({
      ...article,
      imageUrl: toAbsoluteImageUrl(article.imageUrl),
    })),
  }));
}

export async function fetchPresentation(): Promise<PresentationGroupe[]> {
  const res = await fetchWithRetry(`${getApiBaseUrl()}/presentation`);
  const groupes = (await res.json()) as PresentationGroupe[];
  return absolutiseImages(groupes);
}

// --- Admin CRUD (gestion des articles en base, remplace l'édition via Google Sheet) ---

export type PresentationArticle = {
  id: number;
  groupe: string;
  groupeEn: string;
  surtitre: string;
  surtitreEn: string;
  titre: string;
  titreEn: string;
  description: string;
  descriptionEn: string;
  faits: string;
  faitsEn: string;
  titreAccroche: string;
  titreAccrocheEn: string;
  descriptionCourte: string;
  descriptionCourteEn: string;
  imageUrl: string | null;
  lienUrl: string | null;
  lieu: string | null;
  mapsQuery: string | null;
  ordre: number;
  groupeOrdre: number;
  groupeDureeMs: number;
  groupeImageUrl: string | null;
};

export type UpsertPresentationArticlePayload = Omit<
  PresentationArticle,
  'id' | 'groupeOrdre' | 'groupeDureeMs' | 'groupeImageUrl'
>;

export type UpdatePresentationGroupePayload = Partial<{
  nom: string;
  nomEn: string;
  dureeMs: number;
  imageUrl: string | null;
}>;

export type DeplacerDirection = 'haut' | 'bas';

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function groupeUrl(groupe: string): string {
  return `${getApiBaseUrl()}/presentation/groupes/${encodeURIComponent(groupe)}`;
}

export async function fetchPresentationArticles(
  token: string,
): Promise<PresentationArticle[]> {
  const res = await fetchWithRetry(`${getApiBaseUrl()}/presentation/articles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<PresentationArticle[]>;
}

export async function createPresentationArticle(
  payload: UpsertPresentationArticlePayload,
  token: string,
): Promise<PresentationArticle> {
  const res = await fetchWithRetry(`${getApiBaseUrl()}/presentation/articles`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<PresentationArticle>;
}

export async function updatePresentationArticle(
  id: number,
  payload: UpsertPresentationArticlePayload,
  token: string,
): Promise<PresentationArticle> {
  const res = await fetchWithRetry(`${getApiBaseUrl()}/presentation/articles/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<PresentationArticle>;
}

export async function deletePresentationArticle(
  id: number,
  token: string,
): Promise<void> {
  await fetchWithRetry(`${getApiBaseUrl()}/presentation/articles/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deplacerPresentationArticle(
  id: number,
  direction: DeplacerDirection,
  token: string,
): Promise<void> {
  await fetchWithRetry(`${getApiBaseUrl()}/presentation/articles/${id}/deplacer`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ direction }),
  });
}

export async function updatePresentationGroupe(
  groupe: string,
  payload: UpdatePresentationGroupePayload,
  token: string,
): Promise<void> {
  await fetchWithRetry(groupeUrl(groupe), {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function deplacerPresentationGroupe(
  groupe: string,
  direction: DeplacerDirection,
  token: string,
): Promise<void> {
  await fetchWithRetry(`${groupeUrl(groupe)}/deplacer`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ direction }),
  });
}

export async function deletePresentationGroupe(
  groupe: string,
  token: string,
): Promise<void> {
  await fetchWithRetry(groupeUrl(groupe), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
