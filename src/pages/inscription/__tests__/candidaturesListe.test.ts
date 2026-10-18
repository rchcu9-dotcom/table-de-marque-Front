import { describe, it, expect } from "vitest";

import type { CandidatureOrganisateur } from "../../../api/types/inscription.types";
import { normaliserRecherche } from "../../../hooks/useListControls";
import { RECHERCHE_CANDIDATURES, TRIS_CANDIDATURES } from "../candidaturesListe";

// docs/specs/-ajout-de-la-colonne-nomcomplet-contexte-la-colonne-nomcompl.md — §5, CA7
// La recherche de la liste organisateur porte aussi sur le nom complet du club.

function candidature(
  id: number,
  equipeNom: string,
  equipeNomComplet?: string | null,
): CandidatureOrganisateur {
  return {
    id,
    equipeNom,
    ...(equipeNomComplet === undefined ? {} : { equipeNomComplet }),
    equipeLogoUrl: null,
    utilisateurEmail: `ref${id}@club.fr`,
    utilisateurDisplayName: null,
    statut: "CANDIDATE",
    createdAt: "2026-04-01T00:00:00.000Z",
    commentaireOrganisateur: null,
  } as CandidatureOrganisateur;
}

/** Même lecture que `useListControls` : une clé absente ou null vaut chaîne vide. */
function chercher(liste: CandidatureOrganisateur[], saisie: string): string[] {
  const q = normaliserRecherche(saisie);
  return liste
    .filter((c) =>
      RECHERCHE_CANDIDATURES.some((cle) => {
        const valeur = typeof cle === "function" ? cle(c) : c[cle];
        return normaliserRecherche(valeur == null ? "" : String(valeur)).includes(q);
      }),
    )
    .map((c) => c.equipeNom);
}

const LISTE = [
  candidature(1, "Courbevoie", "Les Coqs de Courbevoie"),
  candidature(2, "Rennes", null),
  candidature(3, "Meudon"),
  candidature(4, "Orléans", "Les Renards d'Orléans"),
];

describe("RECHERCHE_CANDIDATURES", () => {
  it("contient le nom court et le nom complet, sans perdre les clés existantes", () => {
    expect(RECHERCHE_CANDIDATURES).toEqual([
      "equipeNom",
      "equipeNomComplet",
      "utilisateurDisplayName",
      "utilisateurEmail",
    ]);
  });

  it.each(["coqs", "COQS", "les coqs de"])(
    "« %s » trouve la candidature de Courbevoie par son nom complet",
    (saisie) => {
      expect(chercher(LISTE, saisie)).toEqual(["Courbevoie"]);
    },
  );

  it("trouve toujours par le nom court", () => {
    expect(chercher(LISTE, "courb")).toEqual(["Courbevoie"]);
  });

  it("ignore les accents dans le nom complet", () => {
    expect(chercher(LISTE, "renards d'orleans")).toEqual(["Orléans"]);
  });

  it.each([
    ["renn", "Rennes"],
    ["meud", "Meudon"],
  ])(
    "une candidature sans nom complet (null ou absent) reste trouvable par son nom : %s",
    (saisie, attendu) => {
      expect(chercher(LISTE, saisie)).toEqual([attendu]);
    },
  );

  it("ne renvoie rien, sans erreur, pour un texte présent dans aucun champ", () => {
    expect(chercher(LISTE, "strasbourg")).toEqual([]);
  });

  it('« null » et « undefined » ne correspondent à aucune candidature sans nom complet', () => {
    expect(chercher(LISTE, "null")).toEqual([]);
    expect(chercher(LISTE, "undefined")).toEqual([]);
  });
});

describe("TRIS_CANDIDATURES", () => {
  it("trie toujours sur le nom court, jamais sur le nom complet", () => {
    const liste = [
      candidature(1, "Rennes", "Aaa Club"),
      candidature(2, "Angers", "Zzz Club"),
    ];

    expect([...liste].sort(TRIS_CANDIDATURES.nom).map((c) => c.equipeNom)).toEqual([
      "Angers",
      "Rennes",
    ]);
    expect([...liste].sort(TRIS_CANDIDATURES["nom-desc"]).map((c) => c.equipeNom)).toEqual([
      "Rennes",
      "Angers",
    ]);
  });
});
