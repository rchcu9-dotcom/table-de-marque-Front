/**
 * Fixture partagée de la page récapitulative /tournoi/infos (tests unitaires et E2E mock).
 * Reproduit le contrat du back : les champs texte ne sont jamais undefined (chaînes vides).
 */
import type { ArticlePresentation, PresentationGroupe } from "../../src/api/presentation";
import type { Edition } from "../../src/api/types/inscription.types";

/**
 * Édition courante complète de test, partagée par les tests unitaires et les E2E mock
 * (option `edition` de startMockBack, qui écrase `etape` par `editionEtape`). Dates à midi
 * UTC : mêmes jours affichés quel que soit le fuseau de la machine (annexe tests R3).
 * Résout {{nomTournoi}}, {{dates}}, {{fraisInscription}}, {{prixRepas}}, {{nbEquipesMax}} et {{anneeAge}}.
 */
export const EDITION_COMPLETE: Edition = {
  id: 1,
  nom: "Tournoi RCHC U11",
  categorie: "U11",
  annee: 2027,
  etape: "INSCRIPTIONS_OUVERTES",
  dateDebut: "2027-05-22T12:00:00.000Z",
  dateFinDebut: "2027-05-23T12:00:00.000Z",
  fraisInscription: 270,
  prixRepas: 12,
  nbPlacesMax: 16,
  hasImageRib: false,
  affichagePlanningPublic: false,
  anneesAge: [2016, 2017],
};

export function makeArticle(overrides: Partial<ArticlePresentation> = {}): ArticlePresentation {
  return {
    groupe: "",
    groupeEn: "",
    surtitre: "",
    surtitreEn: "",
    titre: "Article",
    titreEn: "",
    description: "",
    descriptionEn: "",
    faits: "",
    faitsEn: "",
    titreAccroche: "",
    titreAccrocheEn: "",
    descriptionCourte: "",
    descriptionCourteEn: "",
    imageUrl: null,
    lienUrl: null,
    lieu: null,
    mapsQuery: null,
    ...overrides,
  };
}

export function makeGroupe(
  nom: string,
  articles: ArticlePresentation[],
  overrides: Partial<Omit<PresentationGroupe, "nom" | "articles">> = {},
): PresentationGroupe {
  return {
    nom,
    nomEn: "",
    ordre: 0,
    dureeMs: 5000,
    imageUrl: null,
    ...overrides,
    articles: articles.map((article) => ({ ...article, groupe: nom })),
  };
}

// --- Volume réel (spec consolidée CA5b) -------------------------------------------------

const PHRASES = [
  "Les équipes sont accueillies dès le samedi matin à la patinoire, où un vestiaire leur est attribué pour tout le week-end.",
  "Chaque match se joue sur glace entière, avec changement volant et arrêt du chronomètre pendant les deux dernières minutes.",
  "Les arbitres veillent au respect de l'esprit du jeu et peuvent interrompre une rencontre pour rappeler les règles aux joueurs.",
  "Un repas est proposé aux joueurs et aux encadrants le samedi midi, sur réservation lors de l'inscription de l'équipe.",
  "Les résultats, les classements et le planning sont publiés en direct sur le site du tournoi tout au long des deux jours.",
  "Les parents sont invités à encourager toutes les équipes, dans le respect des joueurs, des arbitres et des bénévoles.",
];

/** Ramène un texte à `cible` caractères au plus, coupé sur une fin de mot et terminé par un point. */
function ajuster(texte: string, cible: number): string {
  if (texte.length <= cible) return texte;
  const coupe = texte.slice(0, cible - 1);
  return `${coupe.slice(0, Math.max(coupe.lastIndexOf(" "), 1)).replace(/[\s,;:.-]+$/, "")}.`;
}

/** Prose déterministe d'environ `cible` caractères, un paragraphe toutes les 3 phrases. */
function prose(cible: number, decalage = 0): string {
  return ajuster(proseBrute(cible, decalage), cible);
}

function proseBrute(cible: number, decalage: number): string {
  const phrases: string[] = [];
  let longueur = 0;
  for (let i = 0; longueur < cible; i++) {
    const phrase = PHRASES[(i + decalage) % PHRASES.length];
    phrases.push(phrase);
    longueur += phrase.length + 1;
  }
  const blocs: string[] = [];
  for (let i = 0; i < phrases.length; i += 3) blocs.push(phrases.slice(i, i + 3).join(" "));
  return blocs.join("\n\n");
}

/** Liste « ligne à ligne » (retours simples, rendus en pre-line), comme le règlement du seed. */
function liste(cible: number, intitule: string): string {
  const lignes = [`${intitule} :`];
  let longueur = lignes[0].length;
  for (let i = 1; longueur < cible; i++) {
    const ligne = `- Point ${i} : ${PHRASES[i % PHRASES.length].slice(0, 70)}.`;
    lignes.push(ligne);
    longueur += ligne.length + 1;
  }
  return ajuster(lignes.join("\n"), cible);
}

/**
 * Contenu anonymisé de volume équivalent au seed hors Médias (22 articles, ~15 000 à 15 600
 * caractères de description) : Présentation ~2 700, Règlement ~6 200 avec des listes,
 * Challenge ~6 700 dont un article de plus de 1 500 caractères (data-long). Un chapitre
 * « Médias » est ajouté pour vérifier son exclusion.
 */
export function buildGroupesVolumeReel(): PresentationGroupe[] {
  const presentation = [380, 400, 380, 400, 380, 380, 380].map((cible, i) =>
    makeArticle({
      surtitre: `Présentation ${i + 1}`,
      titre: `Présentation — article ${i + 1}`,
      description: prose(cible, i),
      faits: i === 0 ? "{{nbEquipesMax}}|Équipes\n2|Jours\n{{fraisInscription}}|Inscription" : "",
    }),
  );
  const reglement = [780, 760, 780, 760, 780, 760, 780, 800].map((cible, i) =>
    makeArticle({
      surtitre: "Règlement",
      titre: `Règlement — article ${i + 1}`,
      description: `${prose(Math.round(cible * 0.48), i)}\n\n${liste(Math.round(cible * 0.52) - 2, `Règle ${i + 1}`)}`,
    }),
  );
  const challenge = [1700, 820, 840, 820, 840, 820, 840].map((cible, i) =>
    makeArticle({
      surtitre: "Challenge",
      titre: `Challenge — article ${i + 1}`,
      description: prose(cible, i + 2),
    }),
  );
  return [
    makeGroupe("Présentation", presentation, { nomEn: "Presentation", ordre: 0, imageUrl: CHAPTER_IMAGE_PATH }),
    makeGroupe("Règlement", reglement, { nomEn: "Rules", ordre: 1, imageUrl: CHAPTER_IMAGE_PATH }),
    makeGroupe("Challenge", challenge, { nomEn: "Challenge", ordre: 2, imageUrl: CHAPTER_IMAGE_PATH }),
    makeGroupe("Médias", [makeArticle({ titre: "Instagram", description: "Suivez-nous sur Instagram." })], {
      nomEn: "Media",
      ordre: 3,
    }),
  ];
}

/** URL d'image de chapitre servie par le mock back E2E (PNG 1×1). */
export const CHAPTER_IMAGE_PATH = "/presentation/image/test-presentation.png";

/**
 * Présentation complète : un chapitre avec Résumé (tokens, chapô + long, lien vers la page
 * elle-même), Inscription et Lieu (adresse, carte, lien Blizz) ; un chapitre sans traduction
 * EN du nom ; un article YouTube et un chapitre Médias, tous deux à exclure.
 */
export function buildTournoiInfosGroupes(imageUrl: string | null = null): PresentationGroupe[] {
  return [
    makeGroupe(
      "Présentation",
      [
        makeArticle({
          surtitre: "Résumé",
          surtitreEn: "Summary",
          titre: "Résumé",
          titreEn: "Summary",
          titreAccroche: "Titre choc",
          titreAccrocheEn: "Punchline",
          descriptionCourte: "Deux jours de glace à {{ville}}.",
          descriptionCourteEn: "Two days on ice in {{ville}}.",
          description: "Le tournoi a lieu les {{dates}}.\n\nInscription : {{fraisInscription}} par équipe.",
          descriptionEn: "The tournament takes place on {{dates}}.\n\nEntry: {{fraisInscription}} per team.",
          faits: "16|Équipes\n{{nbEquipesMax}}|Places",
          faitsEn: "16|Teams\n{{nbEquipesMax}}|Spots",
          lienUrl: "/tournoi/infos",
        }),
        makeArticle({
          titre: "Inscription",
          titreEn: "Registration",
          description: "Inscrivez votre équipe en ligne.",
          descriptionEn: "",
          lienUrl: "https://old-glide-form.example.com",
        }),
        makeArticle({
          surtitre: "Lieu",
          surtitreEn: "Venue",
          titre: "Le Blizz",
          titreEn: "The Blizz",
          description: "Patinoire olympique.",
          descriptionEn: "Olympic rink.",
          lieu: "Le Blizz, Rennes",
          mapsQuery: "Le Blizz Rennes",
          lienUrl: "https://www.leblizz.com",
        }),
        makeArticle({
          titre: "Chaîne YouTube",
          titreEn: "YouTube channel",
          description: "Suivez le live.",
          lienUrl: "https://youtube.com/rchc",
        }),
      ],
      { nomEn: "Presentation", ordre: 0, imageUrl },
    ),
    makeGroupe(
      "Tournoi 5v5",
      [
        makeArticle({
          titre: "Format",
          titreEn: "",
          description: "Deux mi-temps de 12 minutes.",
          descriptionEn: "Two 12-minute halves.",
        }),
      ],
      { nomEn: "", ordre: 1, imageUrl },
    ),
    makeGroupe(
      "Médias",
      [makeArticle({ titre: "Photos", description: "Galerie photos du tournoi." })],
      { nomEn: "Media", ordre: 2, imageUrl },
    ),
  ];
}
