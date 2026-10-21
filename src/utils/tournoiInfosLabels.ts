import type { ContentLang } from "./presentationContent";

export type TournoiInfosLabels = {
  pdf: string;
  pdfHelp: string;
  keyFacts: string;
  map: string;
  learnMore: string;
  venueWebsite: string;
  loading: string;
  error: string;
  empty: string;
  printSource: (url: string, date: string) => string;
  fallbackTitle: string;
  langGroup: string;
};

/** Libellés d'interface de /tournoi/infos (le contenu, lui, vient de l'admin de présentation). */
export const TOURNOI_INFOS_LABELS: Record<ContentLang, TournoiInfosLabels> = {
  fr: {
    pdf: "Télécharger en PDF",
    pdfHelp:
      "Dans la fenêtre d'impression, choisissez « Enregistrer au format PDF ». Si rien ne s'ouvre, ouvrez cette page dans votre navigateur.",
    keyFacts: "Chiffres clés",
    map: "Voir sur la carte",
    learnMore: "En savoir plus",
    // Espace insécable avant les deux-points (typographie française).
    venueWebsite: "Site du lieu :",
    loading: "Chargement...",
    error: "Informations du tournoi indisponibles pour le moment.",
    empty: "Aucune information publiée pour le moment.",
    printSource: (url, date) => `Document issu de ${url} — informations à jour au ${date}.`,
    fallbackTitle: "Tournoi U11 RCHC",
    langGroup: "Langue",
  },
  en: {
    pdf: "Download PDF",
    pdfHelp:
      "In the print dialog, choose “Save as PDF”. If nothing opens, open this page in your browser.",
    keyFacts: "Key figures",
    map: "View on map",
    learnMore: "Learn more",
    venueWebsite: "Venue website:",
    loading: "Loading...",
    error: "Tournament information is unavailable for now.",
    empty: "No information published yet.",
    printSource: (url, date) => `Document from ${url} — information as of ${date}.`,
    fallbackTitle: "RCHC U11 Tournament",
    langGroup: "Language",
  },
};
