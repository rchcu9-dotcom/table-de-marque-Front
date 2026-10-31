import { describe, it, expect } from "vitest";
import type {
  EditionEtape,
  StatutInscription,
} from "../../../api/types/inscription.types";
import {
  afficheMessageVerrouillage,
  estDossierVerrouille,
  messageParcours,
  type EditionMessages,
} from "../messagesParcours";

const STATUTS: StatutInscription[] = [
  "CANDIDATE",
  "LISTE_ATTENTE",
  "RESERVEE",
  "PAIEMENT_ATTENDU",
  "VALIDEE",
  "DOSSIER_EN_COURS",
  "DOSSIER_COMPLET",
  "REFUSEE",
];

const VERROUILLAGE = "Le tournoi a démarré, les dossiers ne sont plus modifiables.";

const REPLIS: [StatutInscription, string][] = [
  ["CANDIDATE", "Ta demande a bien été soumise. En attente de validation."],
  ["LISTE_ATTENTE", "Tu es sur liste d'attente."],
  ["RESERVEE", "Paiement attendu."],
  ["PAIEMENT_ATTENDU", "Paiement attendu."],
  ["VALIDEE", "Inscription confirmée !"],
  ["DOSSIER_EN_COURS", "Complète le dossier de ton équipe (joueurs, coachs, droits à l'image)."],
  ["DOSSIER_COMPLET", "Le dossier de ton équipe a été validé par l'organisateur."],
  [
    "REFUSEE",
    "Nous ne sommes malheureusement pas en mesure de confirmer l'inscription de ton équipe pour cette édition du tournoi. N'hésite pas à contacter l'organisateur si tu as des questions — et à retenter ta chance lors d'une prochaine édition !",
  ],
];

const PERSONNALISES: [StatutInscription, keyof EditionMessages][] = [
  ["CANDIDATE", "msgDemandeSoumise"],
  ["LISTE_ATTENTE", "msgListeAttente"],
  ["PAIEMENT_ATTENDU", "msgPaiementAttendu"],
  ["VALIDEE", "msgInscriptionConfirmee"],
  ["DOSSIER_EN_COURS", "msgRenseigneJoueurs"],
  ["DOSSIER_COMPLET", "msgInscriptionValidee"],
  ["REFUSEE", "msgEquipeRefusee"],
];

function edition(valeurs: Partial<EditionMessages> = {}): EditionMessages {
  return { fraisInscription: 300, ...valeurs };
}

describe("messageParcours — replis", () => {
  it.each(REPLIS)("%s sans édition donne le repli de l'application", (statut, repli) => {
    expect(messageParcours(statut, null, "INSCRIPTIONS_OUVERTES")).toEqual([repli]);
  });

  it.each(REPLIS)("%s avec un message vide donne le repli", (statut, repli) => {
    const vide = edition(
      Object.fromEntries(PERSONNALISES.map(([, champ]) => [champ, ""])) as Partial<EditionMessages>,
    );

    expect(messageParcours(statut, vide, "INSCRIPTIONS_OUVERTES")).toEqual([repli]);
  });

  it("un message composé d'espaces ramène au repli (critère 2)", () => {
    expect(
      messageParcours("LISTE_ATTENTE", edition({ msgListeAttente: "   \n " }), null),
    ).toEqual(["Tu es sur liste d'attente."]);
  });

  it("une valeur null, telle que renvoyée par l'API, ramène au repli", () => {
    const nul = edition({ msgListeAttente: null as unknown as string });

    expect(messageParcours("LISTE_ATTENTE", nul, null)).toEqual(["Tu es sur liste d'attente."]);
  });
});

describe("messageParcours — messages de l'édition", () => {
  it.each(PERSONNALISES)("%s reprend %s tel quel", (statut, champ) => {
    const texte = "  Texte de l'édition\navec un saut de ligne  ";

    expect(messageParcours(statut, edition({ [champ]: texte }), null)).toEqual([texte]);
  });

  it("RESERVEE et PAIEMENT_ATTENDU donnent le même message", () => {
    const e = edition({ msgPaiementAttendu: "À payer", msgChequeInfo1: "Chèque" });

    expect(messageParcours("RESERVEE", e, null)).toEqual(messageParcours("PAIEMENT_ATTENDU", e, null));
  });
});

describe("messageParcours — paiement", () => {
  it("remplace {{frais}} par le montant formaté (critère 7)", () => {
    const [principal] = messageParcours(
      "PAIEMENT_ATTENDU",
      edition({ msgPaiementAttendu: "Frais : {{frais}}, soit {{frais}}." }),
      null,
    );

    expect(principal).toContain("300,00");
    expect(principal).toContain("€");
    expect(principal).not.toContain("{{frais}}");
  });

  it("garde l'ordre message, chèque 1, chèque 2 (critère 8)", () => {
    expect(
      messageParcours(
        "PAIEMENT_ATTENDU",
        edition({ msgPaiementAttendu: "Principal", msgChequeInfo1: "Un", msgChequeInfo2: "Deux" }),
        null,
      ),
    ).toEqual(["Principal", "Un", "Deux"]);
  });

  it.each([[""], ["   "], [null], [undefined]])(
    "ignore un message chèque valant %j (critère 9)",
    (valeur) => {
      expect(
        messageParcours(
          "PAIEMENT_ATTENDU",
          edition({
            msgPaiementAttendu: "Principal",
            msgChequeInfo1: valeur as string,
            msgChequeInfo2: "Deux",
          }),
          null,
        ),
      ).toEqual(["Principal", "Deux"]);
    },
  );

  it("sans édition, le jeton est remplacé avec un montant nul", () => {
    expect(messageParcours("RESERVEE", null, null)).toEqual(["Paiement attendu."]);
  });
});

describe("Verrouillage à l'étape TOURNOI_DEMARRE (critère 5)", () => {
  it.each<StatutInscription>(["VALIDEE", "DOSSIER_EN_COURS"])(
    "%s prend le message de verrouillage, même avec un message d'édition",
    (statut) => {
      const e = edition({ msgInscriptionConfirmee: "Confirmé", msgRenseigneJoueurs: "Complète" });

      expect(messageParcours(statut, e, "TOURNOI_DEMARRE")).toEqual([VERROUILLAGE]);
    },
  );

  it.each<StatutInscription>([
    "CANDIDATE",
    "LISTE_ATTENTE",
    "RESERVEE",
    "PAIEMENT_ATTENDU",
    "DOSSIER_COMPLET",
    "REFUSEE",
  ])("%s garde son message", (statut) => {
    expect(messageParcours(statut, null, "TOURNOI_DEMARRE")).toEqual(
      messageParcours(statut, null, "INSCRIPTIONS_OUVERTES"),
    );
  });

  it.each<EditionEtape | null>([
    "CREEE",
    "CREATION_NOUVEAU_TOURNOI",
    "INSCRIPTIONS_OUVERTES",
    "CLOTUREE",
    null,
  ])("l'étape %s ne verrouille rien", (etape) => {
    for (const statut of STATUTS) {
      expect(estDossierVerrouille(statut, etape)).toBe(false);
      expect(afficheMessageVerrouillage(statut, etape)).toBe(false);
    }
  });

  it("estDossierVerrouille vaut pour tout statut, sauf DOSSIER_COMPLET", () => {
    expect(STATUTS.filter((s) => !estDossierVerrouille(s, "TOURNOI_DEMARRE"))).toEqual([
      "DOSSIER_COMPLET",
    ]);
  });

  it("le message de verrouillage ne remplace que deux statuts", () => {
    expect(STATUTS.filter((s) => afficheMessageVerrouillage(s, "TOURNOI_DEMARRE"))).toEqual([
      "VALIDEE",
      "DOSSIER_EN_COURS",
    ]);
  });
});
