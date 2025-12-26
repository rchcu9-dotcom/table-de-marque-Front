export type TabItem = {
  id: string;
  label: string;
  shortLabel: string;
  path: string;
};

export const tabsConfig: TabItem[] = [
  { id: "home", label: "Accueil", shortLabel: "Accueil", path: "/" },
  { id: "planning", label: "Planning", shortLabel: "Planning", path: "/planning" },
  { id: "tournament", label: "Tournoi 5v5", shortLabel: "5v5", path: "/tournament/5v5" },
  { id: "challenge", label: "Challenge", shortLabel: "Challenge", path: "/challenge" },
  { id: "threevthree", label: "Tournoi 3v3", shortLabel: "3v3", path: "/tournament/3v3" },
];

export default tabsConfig;
