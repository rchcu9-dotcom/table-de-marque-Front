/**
 * Faits quasi-statiques (club, lieu, formule de match, caution) sans champ
 * backend correspondant : Edition/ParametresSportifs ne les portent pas, et
 * ParametresSportifsController est intégralement réservé à l'organisateur
 * (@Roles('ORGANISATEUR') au niveau du contrôleur), donc inutilisable depuis
 * la page de présentation publique. Résolus ici via variables d'environnement
 * plutôt que d'ouvrir une nouvelle route publique ou d'étendre le schéma
 * pour des valeurs qui changent au plus une fois par édition.
 */
export type PresentationStaticInfo = {
  ville: string;
  lieu: string;
  clubNom: string;
  fraisCaution: string;
  formatMatch: string;
};

export function getPresentationStaticInfo(): PresentationStaticInfo {
  return {
    ville: (import.meta.env.VITE_TOURNOI_VILLE as string | undefined) ?? "",
    lieu: (import.meta.env.VITE_TOURNOI_LIEU as string | undefined) ?? "",
    clubNom: (import.meta.env.VITE_TOURNOI_CLUB_NOM as string | undefined) ?? "",
    fraisCaution: (import.meta.env.VITE_TOURNOI_FRAIS_CAUTION as string | undefined) ?? "",
    formatMatch: (import.meta.env.VITE_TOURNOI_FORMAT_MATCH as string | undefined) ?? "",
  };
}
