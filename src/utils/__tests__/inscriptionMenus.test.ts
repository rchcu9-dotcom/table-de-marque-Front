import { describe, it, expect } from "vitest";
import { getInscriptionMenuItems, isTournamentBuilt, getTournamentTabItems } from "../inscriptionMenus";
import type { EditionEtape, ProfilRole } from "../../api/types/inscription.types";
import type { TabItem } from "../../components/navigation/tabsConfig";

// ---------------------------------------------------------------------------
// Tests pour getInscriptionMenuItems(role, etape, hasDossierAccess).
// Critère 5 (spec §5) : matrice rôle × étape × accès dossier.
//
// | Rôle                              | OUVERTES               | CLOTUREE     | DEMARRE |
// |------------------------------------|-------------------------|--------------|---------|
// | ORGANISATEUR                       | Inscription + Admin     | idem         | idem    |
// | TABLE_DE_MARQUE                    | Inscription             | Table        | Table   |
// | RESPONSABLE_EQUIPE (sans dossier)  | Inscription             | rien         | rien    |
// | RESPONSABLE_EQUIPE (avec dossier)  | Inscription + Dossier   | Dossier      | rien    |
// ---------------------------------------------------------------------------

const OUVERTES: EditionEtape = "INSCRIPTIONS_OUVERTES";
const CLOTUREE: EditionEtape = "CLOTUREE";
const DEMARRE: EditionEtape = "TOURNOI_DEMARRE";

function ids(items: ReturnType<typeof getInscriptionMenuItems>): string[] {
  return items.map((i) => i.id);
}

describe("getInscriptionMenuItems", () => {
  describe("visiteur sans rôle (null) — non connecté", () => {
    // Le rôle n'est connu qu'une fois connecté (profilQuery désactivée sans token) : avant
    // ça, "Inscription" est le seul point d'entrée de connexion visible dans la nav — sans
    // lui, un visiteur non connecté ne voyait plus que "Accueil". Il n'inscrit rien lui-même :
    // InscriptionPage redirige déjà vers /connexion tant que !user (rememberCurrentPath).
    it("retourne toujours Inscription (et rien d'autre), quelle que soit l'étape", () => {
      expect(ids(getInscriptionMenuItems(null, OUVERTES, false))).toEqual(["inscription"]);
      expect(ids(getInscriptionMenuItems(null, CLOTUREE, true))).toEqual(["inscription"]);
      expect(ids(getInscriptionMenuItems(null, DEMARRE, true))).toEqual(["inscription"]);
      expect(ids(getInscriptionMenuItems(null, null, false))).toEqual(["inscription"]);
    });

    it("l'item pointe vers /inscription, comme pour les rôles connectés", () => {
      const items = getInscriptionMenuItems(null, OUVERTES, false);
      expect(items[0].path).toBe("/inscription");
    });

    it("n'est pas affecté par hasDossierAccess (non pertinent avant connexion)", () => {
      const withAccess = getInscriptionMenuItems(null, CLOTUREE, true);
      const withoutAccess = getInscriptionMenuItems(null, CLOTUREE, false);
      expect(ids(withAccess)).toEqual(ids(withoutAccess));
    });
  });

  describe("rôle ORGANISATEUR", () => {
    it.each([OUVERTES, CLOTUREE, DEMARRE])(
      "retourne Inscription + Admin quelle que soit l'étape (%s)",
      (etape) => {
        const items = getInscriptionMenuItems("ORGANISATEUR", etape, false);
        expect(ids(items)).toEqual(["inscription", "admin"]);
      },
    );

    it("n'est pas affecté par hasDossierAccess", () => {
      const withAccess = getInscriptionMenuItems("ORGANISATEUR", OUVERTES, true);
      const withoutAccess = getInscriptionMenuItems("ORGANISATEUR", OUVERTES, false);
      expect(ids(withAccess)).toEqual(ids(withoutAccess));
    });

    it("l'item admin pointe vers /admin", () => {
      const items = getInscriptionMenuItems("ORGANISATEUR", OUVERTES, false);
      expect(items.find((i) => i.id === "admin")?.path).toBe("/admin");
    });
  });

  describe("rôle TABLE_DE_MARQUE", () => {
    it("retourne uniquement Inscription en INSCRIPTIONS_OUVERTES", () => {
      const items = getInscriptionMenuItems("TABLE_DE_MARQUE", OUVERTES, false);
      expect(ids(items)).toEqual(["inscription"]);
    });

    it("retourne uniquement Table de marque en CLOTUREE", () => {
      const items = getInscriptionMenuItems("TABLE_DE_MARQUE", CLOTUREE, false);
      expect(ids(items)).toEqual(["table-de-marque"]);
      expect(items[0].path).toBe("/table-de-marque");
    });

    it("retourne uniquement Table de marque en TOURNOI_DEMARRE", () => {
      const items = getInscriptionMenuItems("TABLE_DE_MARQUE", DEMARRE, false);
      expect(ids(items)).toEqual(["table-de-marque"]);
    });

    it("n'est pas affecté par hasDossierAccess", () => {
      const withAccess = getInscriptionMenuItems("TABLE_DE_MARQUE", CLOTUREE, true);
      const withoutAccess = getInscriptionMenuItems("TABLE_DE_MARQUE", CLOTUREE, false);
      expect(ids(withAccess)).toEqual(ids(withoutAccess));
    });
  });

  describe("rôle RESPONSABLE_EQUIPE — dossier non accessible", () => {
    it("retourne uniquement Inscription en INSCRIPTIONS_OUVERTES", () => {
      const items = getInscriptionMenuItems("RESPONSABLE_EQUIPE", OUVERTES, false);
      expect(ids(items)).toEqual(["inscription"]);
    });

    it("ne retourne rien en CLOTUREE", () => {
      const items = getInscriptionMenuItems("RESPONSABLE_EQUIPE", CLOTUREE, false);
      expect(items).toEqual([]);
    });

    it("ne retourne rien en TOURNOI_DEMARRE", () => {
      const items = getInscriptionMenuItems("RESPONSABLE_EQUIPE", DEMARRE, false);
      expect(items).toEqual([]);
    });
  });

  // "Mon dossier" a été retiré comme item de menu distinct (il pointait de toute façon vers
  // /inscription, comme "Inscription" — cf. spec "retirer-item-menu-mon-dossier...") : ces cas
  // vérifient maintenant que seul "Inscription" est retourné, jamais un doublon.
  describe("rôle RESPONSABLE_EQUIPE — dossier accessible", () => {
    it("retourne uniquement Inscription en INSCRIPTIONS_OUVERTES (plus de doublon Mon dossier)", () => {
      const items = getInscriptionMenuItems("RESPONSABLE_EQUIPE", OUVERTES, true);
      expect(ids(items)).toEqual(["inscription"]);
    });

    it("retourne uniquement Inscription en CLOTUREE", () => {
      const items = getInscriptionMenuItems("RESPONSABLE_EQUIPE", CLOTUREE, true);
      expect(ids(items)).toEqual(["inscription"]);
      expect(items[0].path).toBe("/inscription");
    });

    it("ne retourne rien en TOURNOI_DEMARRE (dossier figé, spec §6)", () => {
      const items = getInscriptionMenuItems("RESPONSABLE_EQUIPE", DEMARRE, true);
      expect(items).toEqual([]);
    });
  });

  describe("cohérence générale", () => {
    it("retourne toujours un tableau (jamais null/undefined), quel que soit le rôle/étape", () => {
      const roles: Array<ProfilRole | null> = [
        null,
        "RESPONSABLE_EQUIPE",
        "ORGANISATEUR",
        "TABLE_DE_MARQUE",
      ];
      const etapes: Array<EditionEtape | null> = [null, OUVERTES, CLOTUREE, DEMARRE];
      for (const role of roles) {
        for (const etape of etapes) {
          for (const hasDossierAccess of [true, false]) {
            const items = getInscriptionMenuItems(role, etape, hasDossierAccess);
            expect(Array.isArray(items)).toBe(true);
          }
        }
      }
    });

    it("les items retournés ont toujours id, label, shortLabel et path définis", () => {
      const roles: ProfilRole[] = [
        "RESPONSABLE_EQUIPE",
        "ORGANISATEUR",
        "TABLE_DE_MARQUE",
      ];
      const etapes: EditionEtape[] = [OUVERTES, CLOTUREE, DEMARRE];
      for (const role of roles) {
        for (const etape of etapes) {
          for (const item of getInscriptionMenuItems(role, etape, true)) {
            expect(item.id).toBeDefined();
            expect(item.label).toBeDefined();
            expect(item.shortLabel).toBeDefined();
            expect(item.path).toBeDefined();
          }
        }
      }
    });

    it("RESPONSABLE_EQUIPE et TABLE_DE_MARQUE reçoivent des items distincts en INSCRIPTIONS_OUVERTES (pas le même id)", () => {
      const respItems = getInscriptionMenuItems("RESPONSABLE_EQUIPE", OUVERTES, false);
      const tdmItems = getInscriptionMenuItems("TABLE_DE_MARQUE", CLOTUREE, false);
      expect(respItems[0]?.id).not.toBe(tdmItems[0]?.id);
    });
  });
});

describe("getTournamentTabItems", () => {
  const items: TabItem[] = [
    { id: "home", label: "Accueil", shortLabel: "Accueil", path: "/" },
    { id: "planning", label: "Planning", shortLabel: "Planning", path: "/planning", tournamentContent: true },
    { id: "tournament", label: "Tournoi 5v5", shortLabel: "5v5", path: "/tournament/5v5", tournamentContent: true },
  ];

  it("garde les items non-tournamentContent quels que soient le rôle et l'étape", () => {
    expect(getTournamentTabItems(items, null, OUVERTES).map((i) => i.id)).toContain("home");
  });

  // Spec `title-connexion-transverse-menu-conditionnel-rle-phase-verro.md` §5 (matrice
  // validée) : ORGANISATEUR = "Inscription + Admin" dans les 3 phases, jamais Planning. Une
  // exception avait été ajoutée ici pour montrer Planning à l'ORGANISATEUR avant construction
  // du tournoi — retirée, elle contredisait la matrice et le principe déjà tranché dans
  // `erreur-de-spec-il-sagit-dun-accs-depuis-admin-et-pas-plannin.md` (réglages organisateur
  // uniquement via /admin/*, jamais un raccourci depuis Planning).
  it("masque totalement planning pour l'ORGANISATEUR tant que le tournoi n'est pas construit (aucune exception de rôle)", () => {
    const result = getTournamentTabItems(items, "ORGANISATEUR", OUVERTES);
    expect(result.map((i) => i.id)).toEqual(["home"]);
  });

  it("masque totalement planning pour tous les autres rôles tant que le tournoi n'est pas construit", () => {
    expect(getTournamentTabItems(items, "RESPONSABLE_EQUIPE", OUVERTES).map((i) => i.id)).toEqual(["home"]);
    expect(getTournamentTabItems(items, "TABLE_DE_MARQUE", OUVERTES).map((i) => i.id)).toEqual(["home"]);
    expect(getTournamentTabItems(items, null, OUVERTES).map((i) => i.id)).toEqual(["home"]);
  });

  it("affiche tous les items avec le chemin d'origine une fois le tournoi construit, même pour l'ORGANISATEUR", () => {
    const result = getTournamentTabItems(items, "ORGANISATEUR", CLOTUREE);
    expect(result.map((i) => i.id)).toEqual(["home", "planning", "tournament"]);
    expect(result.find((i) => i.id === "planning")?.path).toBe("/planning");
  });
});

describe("isTournamentBuilt", () => {
  it("retourne false tant qu'aucun match n'a pu être généré (CREEE, INSCRIPTIONS_OUVERTES)", () => {
    expect(isTournamentBuilt("CREEE")).toBe(false);
    expect(isTournamentBuilt(OUVERTES)).toBe(false);
    expect(isTournamentBuilt(null)).toBe(false);
  });

  it("retourne true une fois le tournoi construit (CLOTUREE, TOURNOI_DEMARRE)", () => {
    expect(isTournamentBuilt(CLOTUREE)).toBe(true);
    expect(isTournamentBuilt(DEMARRE)).toBe(true);
  });
});
