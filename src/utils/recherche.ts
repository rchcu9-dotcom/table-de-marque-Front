/**
 * Recherche texte côté navigateur, insensible à la casse et aux accents
 * (docs/specs/-recherche-insensible-aux-accents-contexte-la-recherche-actu.md).
 *
 * Réservé à la recherche « contient ». Les comparaisons d'identité (équipe
 * suivie, filtre d'équipe ou de poule) restent strictes et ne passent pas ici.
 */

/** Valeur d'une donnée dans laquelle on cherche ; null et undefined valent « rien ». */
export type ValeurCherchable = string | number | null | undefined;

/** Minuscules, accents et cédilles retirés, espaces de bord retirés : « ÉVRY Côté » → « evry cote ». */
export function normaliserRecherche(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Prépare une recherche « contient », insensible à la casse et aux accents.
 * Renvoie `null` si la saisie est vide ou faite d'espaces : rien à filtrer.
 * Sinon, un test qui répond vrai dès qu'une des valeurs contient la saisie.
 */
export function preparerRecherche(
  saisie: string | null | undefined,
): ((valeurs: readonly ValeurCherchable[]) => boolean) | null {
  const needle = normaliserRecherche(saisie ?? '');
  if (!needle) return null;
  return (valeurs) =>
    valeurs.some((valeur) => valeur != null && normaliserRecherche(String(valeur)).includes(needle));
}
