/**
 * Retient `value` seulement si un organisateur y a effectivement tapé quelque chose,
 * sinon retombe sur `fallback`. Un `?? fallback` nu ne suffit pas ici : les champs
 * msg* de l'édition sont des chaînes vides ("") par défaut en base, jamais null/undefined,
 * donc `??` ne se déclenche jamais et un champ non renseigné affiche un message vide au
 * lieu du repli (bug confirmé sur msgEquipeRefusee — candidat refusé voyant un texte
 * vide tant que ce champ n'est pas rempli dans Paramètres d'inscription).
 */
export function msgOr(value: string | null | undefined, fallback: string): string {
  return value && value.trim() ? value : fallback;
}
