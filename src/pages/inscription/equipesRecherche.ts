import type { EquipeRef } from '../../api/types/inscription.types';
import { normaliserRecherche } from '../../utils/recherche';

export type FiltreEtatEquipe = 'toutes' | 'actives' | 'desactivees';

/** `nom` ou `nomComplet` contient la saisie déjà normalisée ; saisie vide = tout correspond. */
function correspond(equipe: EquipeRef, needle: string): boolean {
  if (!needle) return true;
  return (
    normaliserRecherche(equipe.nom).includes(needle) ||
    (!!equipe.nomComplet && normaliserRecherche(equipe.nomComplet).includes(needle))
  );
}

/** Équipes actives dont `nom` ou `nomComplet` contient la saisie (casse et accents ignorés). */
export function filtrerEquipes(equipes: readonly EquipeRef[], saisie: string): EquipeRef[] {
  const needle = normaliserRecherche(saisie);
  return equipes.filter((e) => e.active && correspond(e, needle));
}

/** Même recherche, sur tout le référentiel ou restreinte à un état (écran de l'organisateur). */
export function filtrerEquipesReferentiel(
  equipes: readonly EquipeRef[],
  saisie: string,
  etat: FiltreEtatEquipe,
): EquipeRef[] {
  const needle = normaliserRecherche(saisie);
  return equipes.filter(
    (e) =>
      (etat === 'toutes' || (etat === 'actives' ? e.active : !e.active)) && correspond(e, needle),
  );
}
