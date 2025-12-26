export type TabItem = {
  id: string;
  label: string;
  shortLabel: string;
  path: string;
  iconUrl?: string;
};

const thumb = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w64`;

export const tabsConfig: TabItem[] = [
  {
    id: "home",
    label: "Accueil",
    shortLabel: "Accueil",
    path: "/",
    iconUrl: thumb("13IXHpThb7IO2QK8O4IHEwzBa0RZ5_StS"),
  },
  {
    id: "planning",
    label: "Planning",
    shortLabel: "Planning",
    path: "/planning",
    iconUrl: thumb("1kjp7e88EhKzGLjPntCXuk7i602uHOMZz"),
  },
  {
    id: "tournament",
    label: "Tournoi 5v5",
    shortLabel: "5v5",
    path: "/tournament/5v5",
    iconUrl: thumb("1vIehJkzRKfVUUxP86EzX7jaTpD2Wr4AO"),
  },
  {
    id: "challenge",
    label: "Challenge",
    shortLabel: "Challenge",
    path: "/challenge",
    iconUrl: thumb("1BlOlsgBPdgob1SgoN3HXcs-PEcUM8TIh"),
  },
  {
    id: "threevthree",
    label: "Tournoi 3v3",
    shortLabel: "3v3",
    path: "/tournament/3v3",
    iconUrl: thumb("1q2Lqml8IzvI0l348pQnRZb5te4nm4bIh"),
  },
];

export default tabsConfig;
