import homeIcon from "../../assets/icons/nav/home.png";
import planningIcon from "../../assets/icons/nav/planning.png";
import fiveV5Icon from "../../assets/icons/nav/fivev5.png";
import challengeIcon from "../../assets/icons/nav/challenge.png";
import threeV3Icon from "../../assets/icons/nav/threev3.png";
import liveIcon from "../../assets/icons/nav/live.svg";

export type TabItem = {
  id: string;
  label: string;
  shortLabel: string;
  path: string;
  iconUrl?: string;
  /**
   * true = n'a de sens qu'une fois le tournoi construit (matchs générés à la
   * clôture des inscriptions). Masqué tant que l'édition est en
   * CREEE/INSCRIPTIONS_OUVERTES — voir utils/inscriptionMenus.ts:isTournamentBuilt.
   */
  tournamentContent?: boolean;
};

export const tabsConfig: TabItem[] = [
  {
    id: "home",
    label: "Accueil",
    shortLabel: "Accueil",
    path: "/",
    iconUrl: homeIcon,
  },
  {
    id: "planning",
    label: "Planning",
    shortLabel: "Planning",
    path: "/planning",
    iconUrl: planningIcon,
    tournamentContent: true,
  },
  {
    id: "tournament",
    label: "Tournoi 5v5",
    shortLabel: "5v5",
    path: "/tournament/5v5",
    iconUrl: fiveV5Icon,
    tournamentContent: true,
  },
];

export const menuConfig: TabItem[] = [
  {
    id: "live",
    label: "Live",
    shortLabel: "Live",
    path: "/live",
    iconUrl: liveIcon,
    tournamentContent: true,
  },
  {
    id: "challenge",
    label: "Challenge",
    shortLabel: "Challenge",
    path: "/challenge",
    iconUrl: challengeIcon,
    tournamentContent: true,
  },
  {
    id: "threevthree",
    label: "Tournoi 3v3",
    shortLabel: "3v3",
    path: "/tournament/3v3",
    iconUrl: threeV3Icon,
    tournamentContent: true,
  },
];

export default tabsConfig;
