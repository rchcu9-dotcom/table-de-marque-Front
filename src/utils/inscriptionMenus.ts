import type { TabItem } from '../components/navigation/tabsConfig';
import type { EditionEtape, ProfilRole } from '../api/types/inscription.types';

const INSCRIPTION_ITEM: TabItem = {
  id: 'inscription',
  label: 'Inscription',
  shortLabel: 'Inscription',
  path: '/inscription',
};

const ADMIN_ITEM: TabItem = {
  id: 'admin',
  label: 'Admin',
  shortLabel: 'Admin',
  path: '/admin',
};

const TABLE_DE_MARQUE_ITEM: TabItem = {
  id: 'table-de-marque',
  label: 'Table de marque',
  shortLabel: 'Table',
  path: '/table-de-marque',
};

/**
 * Le tournoi (matchs, planning) n'est généré qu'à la clôture des
 * inscriptions — inutile d'afficher un planning ou des équipes qui
 * n'existent pas encore tant qu'on est en CREEE/INSCRIPTIONS_OUVERTES.
 */
export function isTournamentBuilt(etape: EditionEtape | null): boolean {
  return etape === 'CLOTUREE' || etape === 'TOURNOI_DEMARRE';
}

/**
 * Filtre les items "tournamentContent" (tabsConfig/menuConfig) selon l'étape.
 * Tant que le tournoi n'est pas construit, ces items sont masqués — sans exception de rôle.
 *
 * Une exception « planning pour l'ORGANISATEUR » a existé ici (accès rapide aux paramètres
 * sportifs avant que le planning existe) — retirée : elle contredisait la matrice rôle × étape
 * validée (spec `title-connexion-transverse-menu-conditionnel-rle-phase-verro.md` §5 :
 * ORGANISATEUR = « Inscription + Admin » dans les 3 phases, jamais Planning) et le principe déjà
 * tranché dans `erreur-de-spec-il-sagit-dun-accs-depuis-admin-et-pas-plannin.md` : les réglages
 * organisateur passent uniquement par `/admin/*`, jamais par un raccourci depuis Planning. Le
 * chemin vers les paramètres sportifs pour un organisateur reste `/admin` (§7 de la spec
 * ci-dessus), déjà dans `getInscriptionMenuItems`.
 */
export function getTournamentTabItems(
  items: TabItem[],
  role: ProfilRole | null,
  etape: EditionEtape | null,
): TabItem[] {
  const tournamentBuilt = isTournamentBuilt(etape);
  return items.filter((tab) => !tab.tournamentContent || tournamentBuilt);
}

/**
 * Dérivation pure (rôle × étape × accès dossier) -> items de nav
 * additionnels. Matrice validée (spec §5), révisée : l'item "Mon dossier" a été retiré (il
 * pointait de toute façon vers /inscription, comme "Inscription" — Lionel : "la navigation via
 * Inscription est suffisante", cf. spec de retrait) :
 *
 * | Rôle                              | OUVERTES     | CLOTUREE   | DEMARRE |
 * |-----------------------------------|--------------|------------|---------|
 * | ORGANISATEUR                      | Inscription + Admin | idem | idem   |
 * | TABLE_DE_MARQUE                   | Inscription  | Table      | Table   |
 * | RESPONSABLE_EQUIPE (sans dossier) | Inscription  | rien       | rien    |
 * | RESPONSABLE_EQUIPE (avec dossier) | Inscription  | Inscription | rien   |
 * | Non connecté (role null)          | Inscription  | Inscription | Inscription |
 *
 * Le rôle n'est connu qu'une fois connecté (profilQuery désactivée sans token,
 * cf. useInscriptionSession) : pour un visiteur non connecté, "Inscription" est le
 * seul point d'entrée de connexion visible dans la nav (Lionel : "seul accueil
 * apparaît aujourd'hui"). Il n'inscrit rien lui-même — InscriptionPage redirige déjà
 * vers /connexion tant que !user (rememberCurrentPath, point d'entrée de connexion
 * unique déjà en place) — donc visible quelle que soit l'étape, contrairement aux
 * autres lignes de la matrice qui, elles, gardent un sens d'inscription réel.
 *
 * Profil + Déconnexion sont portés par le bouton global (AuthButton), pas ici.
 */
export function getInscriptionMenuItems(
  role: ProfilRole | null,
  etape: EditionEtape | null,
  hasDossierAccess: boolean,
): TabItem[] {
  if (role === 'ORGANISATEUR') {
    return [INSCRIPTION_ITEM, ADMIN_ITEM];
  }

  if (role === 'TABLE_DE_MARQUE') {
    if (etape === 'INSCRIPTIONS_OUVERTES') {
      return [INSCRIPTION_ITEM];
    }
    return [TABLE_DE_MARQUE_ITEM];
  }

  if (role === 'RESPONSABLE_EQUIPE') {
    if (etape === 'TOURNOI_DEMARRE') {
      return [];
    }
    if (etape === 'CLOTUREE') {
      return hasDossierAccess ? [INSCRIPTION_ITEM] : [];
    }
    return [INSCRIPTION_ITEM];
  }

  // role === null : non connecté.
  return [INSCRIPTION_ITEM];
}
