/**
 * Nom à transformer en slug pour un logo de secours, quand l'API n'a pas fourni
 * d'URL (docs/specs/-impact-sur-les-pages-publiques-contexte-les-pages-publiques.md).
 * Toujours un nom COURT :
 *  1. l'identifiant de l'équipe publique si elle est connue (`Team.id`) ;
 *  2. sinon le nom d'équipe renvoyé par l'API (`ta_equipes.EQUIPE`).
 * Jamais le libellé affiché (`equipe.name`), ni `player.teamId` — en base réelle
 * c'est la clé numérique de `ta_equipes`, pas un nom.
 */
export function nomPourLogoDeSecours(
  equipe: { id: string } | null | undefined,
  nomEquipeApi: string | null | undefined,
): string | null {
  const id = equipe?.id?.trim();
  if (id) return id;
  const nom = nomEquipeApi?.trim();
  return nom || null;
}
