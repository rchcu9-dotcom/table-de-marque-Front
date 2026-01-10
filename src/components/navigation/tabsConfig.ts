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
  },
  {
    id: "live",
    label: "Live",
    shortLabel: "Live",
    path: "/live",
    iconUrl: liveIcon,
  },
  {
    id: "tournament",
    label: "Tournoi 5v5",
    shortLabel: "5v5",
    path: "/tournament/5v5",
    iconUrl: fiveV5Icon,
  },
  {
    id: "challenge",
    label: "Challenge",
    shortLabel: "Challenge",
    path: "/challenge",
    iconUrl: challengeIcon,
  },
  {
    id: "threevthree",
    label: "Tournoi 3v3",
    shortLabel: "3v3",
    path: "/tournament/3v3",
    iconUrl: threeV3Icon,
  },
];

export default tabsConfig;
