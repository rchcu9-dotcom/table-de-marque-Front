import { describe, it, expect } from "vitest";

import { ServerError } from "../../../api/errors";
import type { EquipeRef } from "../../../api/types/inscription.types";
import {
  MESSAGE_NOM_COURT_VERROUILLE,
  MESSAGE_NOM_SANS_EMOJI,
  NOM_COMPLET_MAX,
  NOM_COURT_MAX,
} from "../equipeCreationErreur";
import {
  construireModification,
  estNomCourtVerrouille,
  estRefusVerrouNomCourt,
  messageErreurModificationEquipe,
} from "../equipeModification";

// docs/specs/recommandations-finales-contexte-la-mise-en-place-de-la-colo.md — §3, §4 ; CA4, CA5, CA6

const LIBRE: EquipeRef = {
  id: 1,
  nom: "Courbevoie",
  nomComplet: "Les Coqs de Courbevoie",
  active: true,
  nbCandidatures: 0,
};
const VERROUILLEE: EquipeRef = { ...LIBRE, id: 2, nbCandidatures: 2 };
const SANS_NOM_COMPLET: EquipeRef = { id: 3, nom: "Rennes", nomComplet: null, active: true };

describe("estNomCourtVerrouille", () => {
  it("est vrai dès une candidature", () => {
    expect(estNomCourtVerrouille({ ...LIBRE, nbCandidatures: 1 })).toBe(true);
    expect(estNomCourtVerrouille(VERROUILLEE)).toBe(true);
  });

  it("est faux à zéro, et quand le back ne fournit pas le compteur", () => {
    expect(estNomCourtVerrouille(LIBRE)).toBe(false);
    expect(estNomCourtVerrouille(SANS_NOM_COMPLET)).toBe(false);
  });
});

describe("construireModification", () => {
  it("renvoie null quand rien n'a changé", () => {
    expect(construireModification(LIBRE, "Courbevoie", "Les Coqs de Courbevoie")).toBeNull();
    expect(construireModification(SANS_NOM_COMPLET, "Rennes", "")).toBeNull();
  });

  it("ne compte pas les espaces de bord comme un changement", () => {
    expect(construireModification(LIBRE, "  Courbevoie ", " Les Coqs de Courbevoie  ")).toBeNull();
  });

  it("n'envoie que le nom complet quand lui seul change (clé nom absente)", () => {
    const modification = construireModification(LIBRE, "Courbevoie", "Coqs HC");

    expect(modification).toEqual({ nomComplet: "Coqs HC" });
    expect(modification).not.toHaveProperty("nom");
  });

  it("n'envoie que le nom court quand lui seul change (clé nomComplet absente)", () => {
    const modification = construireModification(LIBRE, "Courbevoie Coqs", "Les Coqs de Courbevoie");

    expect(modification).toEqual({ nom: "Courbevoie Coqs" });
    expect(modification).not.toHaveProperty("nomComplet");
  });

  it("envoie les deux quand les deux changent, sans espaces de bord", () => {
    expect(construireModification(LIBRE, " Rennes ", " Les Cormorans ")).toEqual({
      nom: "Rennes",
      nomComplet: "Les Cormorans",
    });
  });

  it("envoie nomComplet: null quand le champ a été vidé", () => {
    expect(construireModification(LIBRE, "Courbevoie", "")).toEqual({ nomComplet: null });
    expect(construireModification(LIBRE, "Courbevoie", "   ")).toEqual({ nomComplet: null });
  });

  it("ajoute un nom complet à une équipe qui n'en avait pas", () => {
    expect(construireModification(SANS_NOM_COMPLET, "Rennes", "Les Cormorans de Rennes")).toEqual({
      nomComplet: "Les Cormorans de Rennes",
    });
  });

  it("traite un changement de casse ou d'accent du nom court comme une modification", () => {
    expect(construireModification(LIBRE, "COURBEVOIE", "Les Coqs de Courbevoie")).toEqual({
      nom: "COURBEVOIE",
    });
    expect(construireModification(LIBRE, "Courbévoie", "Les Coqs de Courbevoie")).toEqual({
      nom: "Courbévoie",
    });
  });

  it("n'applique aucune règle de nom : un nom complet égal au nom court part tel quel (le back décide)", () => {
    expect(construireModification(LIBRE, "Courbevoie", "Courbevoie")).toEqual({
      nomComplet: "Courbevoie",
    });
  });

  describe("équipe verrouillée", () => {
    it("n'envoie jamais la clé nom, même si la saisie diffère", () => {
      const modification = construireModification(VERROUILLEE, "Rennes", "Coqs HC");

      expect(modification).toEqual({ nomComplet: "Coqs HC" });
      expect(modification).not.toHaveProperty("nom");
    });

    it("renvoie null si seul le nom court a été touché", () => {
      expect(construireModification(VERROUILLEE, "Rennes", "Les Coqs de Courbevoie")).toBeNull();
    });

    it("permet toujours de vider le nom complet", () => {
      expect(construireModification(VERROUILLEE, "Courbevoie", "")).toEqual({ nomComplet: null });
    });
  });
});

describe("messageErreurModificationEquipe", () => {
  it("distingue les deux 409 : verrou du nom court", () => {
    const erreur = new ServerError(409, MESSAGE_NOM_COURT_VERROUILLE);

    expect(messageErreurModificationEquipe(erreur)).toBe(MESSAGE_NOM_COURT_VERROUILLE);
    expect(estRefusVerrouNomCourt(erreur)).toBe(true);
  });

  it("distingue les deux 409 : nom déjà pris", () => {
    const erreur = new ServerError(409, "Cette équipe existe déjà");

    expect(messageErreurModificationEquipe(erreur)).toBe("Cette équipe existe déjà");
    expect(estRefusVerrouNomCourt(erreur)).toBe(false);
  });

  it("reconnaît le message du verrou même enrobé par le serveur", () => {
    const erreur = new ServerError(409, `Conflict: ${MESSAGE_NOM_COURT_VERROUILLE}`);

    expect(messageErreurModificationEquipe(erreur)).toBe(MESSAGE_NOM_COURT_VERROUILLE);
  });

  it("ne prend pas pour un verrou le même texte sous un autre statut", () => {
    expect(estRefusVerrouNomCourt(new ServerError(400, MESSAGE_NOM_COURT_VERROUILLE))).toBe(false);
    expect(estRefusVerrouNomCourt(new Error(MESSAGE_NOM_COURT_VERROUILLE))).toBe(false);
  });

  it("relaie le refus d'emoji", () => {
    expect(messageErreurModificationEquipe(new ServerError(400, MESSAGE_NOM_SANS_EMOJI))).toBe(
      MESSAGE_NOM_SANS_EMOJI,
    );
  });

  it("n'affiche pas tels quels les autres 400 (messages de validation techniques)", () => {
    expect(
      messageErreurModificationEquipe(
        new ServerError(400, "nom must be shorter than or equal to 100 characters"),
      ),
    ).toBe("Erreur lors de l'enregistrement. Réessaie.");
  });

  it("signale une équipe disparue (404)", () => {
    expect(messageErreurModificationEquipe(new ServerError(404, "introuvable"))).toBe(
      "Cette équipe n'existe plus.",
    );
  });

  it.each([new ServerError(500, "boom"), new Error("réseau"), "texte", null, undefined])(
    "retombe sur le message générique (%s)",
    (erreur) => {
      expect(messageErreurModificationEquipe(erreur)).toBe(
        "Erreur lors de l'enregistrement. Réessaie.",
      );
    },
  );
});

describe("constantes partagées avec le back", () => {
  it("reprend les longueurs maximales des colonnes", () => {
    expect(NOM_COURT_MAX).toBe(100);
    expect(NOM_COMPLET_MAX).toBe(150);
  });

  it("reprend le libellé exact du verrou", () => {
    expect(MESSAGE_NOM_COURT_VERROUILLE).toBe(
      "Le nom court ne peut plus être modifié : une candidature fait référence à cette équipe",
    );
  });
});
