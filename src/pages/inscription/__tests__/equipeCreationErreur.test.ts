import { describe, it, expect } from "vitest";

import { NetworkError, ServerError } from "../../../api/errors";
import { MESSAGE_NOM_SANS_EMOJI, messageErreurCreationEquipe } from "../equipeCreationErreur";

// docs/specs/-prise-en-compte-du-nom-court-pour-les-logos-contexte-actuel.md — CA8

const GENERIQUE = "Erreur lors de la création. Réessaie.";

describe("messageErreurCreationEquipe", () => {
  it("annonce le doublon pour une réponse 409", () => {
    expect(messageErreurCreationEquipe(new ServerError(409, "Conflict"))).toBe(
      "Cette équipe existe déjà",
    );
  });

  it.each([400, 401, 403, 500, 503])(
    "garde le message générique pour une réponse %i",
    (status) => {
      expect(messageErreurCreationEquipe(new ServerError(status, "x"))).toBe(GENERIQUE);
    },
  );

  // docs/specs/-correction-des-anomalies-dans-la-liste-contexte-dans-la-lis.md — CA5
  describe("refus d'un emoji (400)", () => {
    const MOTIF = "Le nom ne doit pas contenir d'emoji";

    it("affiche le motif quand le back refuse un emoji", () => {
      expect(messageErreurCreationEquipe(new ServerError(400, MOTIF))).toBe(MOTIF);
    });

    it("reconnaît le motif au milieu de plusieurs messages de validation joints", () => {
      const joint = `nom should not be empty, ${MOTIF}, autre message`;

      expect(messageErreurCreationEquipe(new ServerError(400, joint))).toBe(MOTIF);
    });

    it("expose le même libellé que le back", () => {
      expect(MESSAGE_NOM_SANS_EMOJI).toBe(MOTIF);
    });

    it.each([
      "Le nom est obligatoire",
      "nomComplet must be shorter than or equal to 150 characters",
      "Bad Request",
      "",
    ])("garde le message générique pour un autre refus 400 (%p)", (message) => {
      expect(messageErreurCreationEquipe(new ServerError(400, message))).toBe(GENERIQUE);
    });

    it("n'affiche pas le motif pour un autre statut portant le même texte", () => {
      expect(messageErreurCreationEquipe(new ServerError(500, MOTIF))).toBe(GENERIQUE);
      expect(messageErreurCreationEquipe(new ServerError(409, MOTIF))).toBe(
        "Cette équipe existe déjà",
      );
    });
  });

  it("garde le message générique pour une erreur réseau ou une valeur quelconque", () => {
    expect(messageErreurCreationEquipe(new NetworkError("offline"))).toBe(GENERIQUE);
    expect(messageErreurCreationEquipe(new Error("boom"))).toBe(GENERIQUE);
    expect(messageErreurCreationEquipe(undefined)).toBe(GENERIQUE);
    expect(messageErreurCreationEquipe({ status: 409 })).toBe(GENERIQUE);
  });
});
