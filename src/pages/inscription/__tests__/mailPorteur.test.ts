import { describe, it, expect } from "vitest";
import type {
  Edition,
  EditionEtape,
  StatutInscription,
} from "../../../api/types/inscription.types";
import {
  LONGUEUR_MAX_MAILTO,
  composerMailPorteur,
  construireMailto,
  preparerLienMail,
  type MailPorteur,
} from "../mailPorteur";

const ORIGINE = "https://site.example";
const MENTION_RIB = `Le RIB est disponible sur l'application d'inscription : ${ORIGINE}/inscription`;

function edition(valeurs: Partial<Edition> = {}): Edition {
  return {
    id: 1,
    nom: "Tournoi RCHC U11 2027",
    categorie: "U11",
    annee: 2027,
    etape: "INSCRIPTIONS_OUVERTES",
    dateDebut: "2027-05-14T00:00:00",
    dateFinDebut: "2027-05-16T00:00:00",
    fraisInscription: 300,
    prixRepas: 15,
    nbPlacesMax: 16,
    hasImageRib: false,
    contactEmail: "responsable@tournoi.fr",
    ...valeurs,
  } as Edition;
}

function composer(
  statut: StatutInscription,
  valeurs: Partial<Edition> = {},
  etape: EditionEtape | null = "INSCRIPTIONS_OUVERTES",
): MailPorteur {
  return composerMailPorteur({
    email: "porteur@club.fr",
    statut,
    edition: edition(valeurs),
    etape,
    origine: ORIGINE,
  });
}

/** Relit une adresse comme une messagerie : une entrée par champ, valeurs décodées. */
function lire(href: string) {
  expect(href.startsWith("mailto:")).toBe(true);
  const [adresse, requete = ""] = href.slice("mailto:".length).split("?");
  const paires = requete.split("&").map((paire) => {
    const i = paire.indexOf("=");
    return [paire.slice(0, i), decodeURIComponent(paire.slice(i + 1))] as const;
  });
  return { a: decodeURIComponent(adresse), noms: paires.map(([nom]) => nom), champs: Object.fromEntries(paires) };
}

describe("composerMailPorteur — objets et textes", () => {
  it.each<[StatutInscription, string]>([
    ["CANDIDATE", "Votre demande d'inscription au tournoi RCHC U11 a bien été reçue"],
    ["LISTE_ATTENTE", "Vous êtes sur liste d'attente du tournoi RCHC U11"],
    ["RESERVEE", "Votre place au tournoi RCHC U11 : paiement attendu"],
    ["PAIEMENT_ATTENDU", "Votre place au tournoi RCHC U11 : paiement attendu"],
    ["VALIDEE", "Votre inscription au tournoi RCHC U11 est confirmée"],
    ["DOSSIER_EN_COURS", "Complétez le dossier de votre équipe pour le tournoi RCHC U11"],
    ["DOSSIER_COMPLET", "Le dossier de votre équipe pour le tournoi RCHC U11 est validé"],
    ["REFUSEE", "Votre demande d'inscription au tournoi RCHC U11 n'a pas pu être retenue"],
  ])("%s a l'objet du tableau de la spec (critère 3)", (statut, objet) => {
    expect(composer(statut).objet).toBe(objet);
  });

  it.each<[StatutInscription, keyof Edition]>([
    ["CANDIDATE", "msgDemandeSoumise"],
    ["LISTE_ATTENTE", "msgListeAttente"],
    ["PAIEMENT_ATTENDU", "msgPaiementAttendu"],
    ["VALIDEE", "msgInscriptionConfirmee"],
    ["DOSSIER_EN_COURS", "msgRenseigneJoueurs"],
    ["DOSSIER_COMPLET", "msgInscriptionValidee"],
    ["REFUSEE", "msgEquipeRefusee"],
  ])("%s a pour texte exact %s, sans salutation ni signature", (statut, champ) => {
    expect(composer(statut, { [champ]: "Texte de l'édition" }).texte).toBe("Texte de l'édition");
  });

  it("l'objet suit categorie, jamais nom", () => {
    const { objet } = composer("LISTE_ATTENTE", { categorie: "U13", nom: "RCHC U11 2026" });

    expect(objet).toBe("Vous êtes sur liste d'attente du tournoi RCHC U13");
  });

  it("repli du texte quand msgListeAttente est vide (critère 2)", () => {
    expect(composer("LISTE_ATTENTE", { msgListeAttente: "   " }).texte).toBe(
      "Tu es sur liste d'attente.",
    );
  });

  it.each<StatutInscription>(["VALIDEE", "DOSSIER_EN_COURS"])(
    "%s à TOURNOI_DEMARRE porte le message et l'objet de verrouillage (critère 5)",
    (statut) => {
      const mail = composer(statut, { msgInscriptionConfirmee: "Confirmé" }, "TOURNOI_DEMARRE");

      expect(mail.texte).toBe("Le tournoi a démarré, les dossiers ne sont plus modifiables.");
      expect(mail.objet).toBe("Les dossiers du tournoi RCHC U11 ne sont plus modifiables");
    },
  );

  it("DOSSIER_COMPLET à TOURNOI_DEMARRE garde son objet et son texte", () => {
    const mail = composer("DOSSIER_COMPLET", { msgInscriptionValidee: "Validé" }, "TOURNOI_DEMARRE");

    expect(mail.texte).toBe("Validé");
    expect(mail.objet).toBe("Le dossier de votre équipe pour le tournoi RCHC U11 est validé");
  });
});

describe("composerMailPorteur — paiement", () => {
  it("remplace {{frais}} et ne le laisse jamais (critère 7)", () => {
    const { texte } = composer("PAIEMENT_ATTENDU", { msgPaiementAttendu: "Frais : {{frais}}" });

    expect(texte).toMatch(/^Frais : 300,00.€$/);
    expect(texte).not.toContain("{{frais}}");
  });

  it("sépare les paragraphes par une ligne vide, dans l'ordre (critère 8)", () => {
    const { texte } = composer("RESERVEE", {
      msgPaiementAttendu: "Principal",
      msgChequeInfo1: "Un",
      msgChequeInfo2: "Deux",
    });

    expect(texte).toBe("Principal\n\nUn\n\nDeux");
  });

  it("n'ajoute pas de paragraphe vide pour un message absent (critère 9)", () => {
    const { texte } = composer("PAIEMENT_ATTENDU", {
      msgPaiementAttendu: "Principal",
      msgChequeInfo1: "Un",
      msgChequeInfo2: "  ",
    });

    expect(texte).toBe("Principal\n\nUn");
  });

  it.each<[string, Partial<Edition>]>([
    ["hasImageRib", { hasImageRib: true }],
    ["imageRibUrl", { imageRibUrl: "https://drive.example/rib-secret.png" }],
  ])("termine par la mention RIB avec %s (critère 10)", (_nom, rib) => {
    const { texte } = composer("PAIEMENT_ATTENDU", { msgPaiementAttendu: "Principal", ...rib });

    expect(texte).toBe(`Principal\n\n${MENTION_RIB}`);
    expect(texte).not.toContain("rib-secret");
    expect(texte).not.toContain("image-rib");
  });

  it.each<StatutInscription>(["RESERVEE", "PAIEMENT_ATTENDU"])(
    "%s porte la mention RIB",
    (statut) => {
      expect(composer(statut, { hasImageRib: true }).texte).toContain(MENTION_RIB);
    },
  );

  it("sans RIB, aucune mention (critère 11)", () => {
    expect(composer("PAIEMENT_ATTENDU").texte).not.toContain("RIB");
  });

  it.each<StatutInscription>([
    "CANDIDATE",
    "LISTE_ATTENTE",
    "VALIDEE",
    "DOSSIER_EN_COURS",
    "DOSSIER_COMPLET",
    "REFUSEE",
  ])("%s ne porte jamais de mention RIB, même avec un RIB configuré", (statut) => {
    expect(composer(statut, { hasImageRib: true }).texte).not.toContain("RIB");
  });
});

describe("composerMailPorteur — destinataires", () => {
  it("adresse le mail au porteur, sans espaces autour", () => {
    const mail = composerMailPorteur({
      email: "  porteur@club.fr ",
      statut: "CANDIDATE",
      edition: edition(),
      etape: null,
      origine: ORIGINE,
    });

    expect(mail.a).toBe("porteur@club.fr");
  });

  it("nettoie le Cc (critère 13)", () => {
    expect(composer("CANDIDATE", { contactEmail: "  responsable@tournoi.fr \n" }).cc).toBe(
      "responsable@tournoi.fr",
    );
  });

  it.each([[""], ["   "], [null], [undefined]])("Cc absent pour %j (critère 12)", (valeur) => {
    expect(composer("CANDIDATE", { contactEmail: valeur as string }).cc).toBeNull();
  });
});

describe("construireMailto", () => {
  const mail = { a: "porteur@club.fr", cc: "responsable@tournoi.fr", objet: "Objet", texte: "Texte" };

  it("porte À, Cc, Objet et Texte", () => {
    expect(lire(construireMailto(mail))).toEqual({
      a: "porteur@club.fr",
      noms: ["cc", "subject", "body"],
      champs: { cc: "responsable@tournoi.fr", subject: "Objet", body: "Texte" },
    });
  });

  it("laisse @ en clair dans les adresses", () => {
    const href = construireMailto(mail);

    expect(href).toContain("mailto:porteur@club.fr?");
    expect(href).toContain("cc=responsable@tournoi.fr");
  });

  it("omet cc sans contact, le lien reste valide (critère 12)", () => {
    const href = construireMailto({ ...mail, cc: null });

    expect(href).toBe("mailto:porteur@club.fr?subject=Objet&body=Texte");
  });

  it("omet body sans texte", () => {
    expect(lire(construireMailto({ a: mail.a, cc: null, objet: "Objet" })).noms).toEqual(["subject"]);
  });

  it("restitue à l'identique les caractères sensibles (critère 14)", () => {
    const texte = "Été à 100 % ? l'équipe #1 & co + 2 = 3";
    const lu = lire(construireMailto({ ...mail, objet: texte, texte }));

    expect(lu.champs.body).toBe(texte);
    expect(lu.champs.subject).toBe(texte);
  });

  it("n'a jamais de + à la place d'une espace (critère 14)", () => {
    const href = construireMailto({ ...mail, texte: "un deux", objet: "trois quatre" });

    expect(href).toContain("un%20deux");
    expect(href).toContain("trois%20quatre");
    expect(href).not.toContain("+");
  });

  it("encode le + du texte", () => {
    expect(construireMailto({ ...mail, texte: "1+1" })).toContain("1%2B1");
  });

  it.each([
    ["\n", "LF"],
    ["\r\n", "CRLF"],
    ["\r", "CR"],
  ])("normalise les sauts de ligne en %%0D%%0A (%s)", (saut) => {
    const href = construireMailto({ ...mail, texte: `un${saut}deux` });

    expect(href).toContain("un%0D%0Adeux");
    expect(href).not.toContain("%0D%0D");
    expect(href).not.toContain("%0A%0A");
  });

  it("un texte ne peut pas créer ou modifier un champ (critère 14)", () => {
    const lu = lire(
      construireMailto({
        ...mail,
        objet: "Objet&bcc=pirate@x.fr",
        texte: "Texte&cc=pirate@x.fr&subject=Pirate",
      }),
    );

    expect(lu.noms).toEqual(["cc", "subject", "body"]);
    expect(lu.champs.cc).toBe("responsable@tournoi.fr");
    expect(lu.champs.subject).toBe("Objet&bcc=pirate@x.fr");
  });

  it("une adresse piégée ne peut pas créer de champ, ni de saut de ligne (critère 14)", () => {
    const lu = lire(
      construireMailto({
        ...mail,
        a: "porteur@club.fr?bcc=pirate@x.fr",
        cc: "contact@x.fr&bcc=pirate@x.fr\r\nBcc: pirate@x.fr",
      }),
    );

    expect(lu.noms).toEqual(["cc", "subject", "body"]);
    expect(lu.a).toBe("porteur@club.fr?bcc=pirate@x.fr");
    expect(lu.champs).not.toHaveProperty("bcc");
  });
});

describe("preparerLienMail — seuil de longueur (critère 15)", () => {
  const base: MailPorteur = { a: "porteur@club.fr", cc: "c@d.fr", objet: "Objet", texte: "a" };

  /** Texte dont l'adresse complète fait exactement `longueur` caractères encodés. */
  function texteDeLongueur(longueur: number): string {
    return "a".repeat(longueur - construireMailto(base).length + 1);
  }

  it("le seuil vaut 1 800 caractères", () => {
    expect(LONGUEUR_MAX_MAILTO).toBe(1800);
  });

  it("sous le seuil, l'adresse contient le texte et rien n'est à copier", () => {
    const lien = preparerLienMail(base);

    expect(lien.href).toBe(construireMailto(base));
    expect(lien.texteACopier).toBeNull();
  });

  it("à exactement 1 800, l'adresse garde le texte", () => {
    const mail = { ...base, texte: texteDeLongueur(1800) };

    expect(construireMailto(mail)).toHaveLength(1800);
    expect(preparerLienMail(mail).texteACopier).toBeNull();
  });

  it("à 1 801, le texte sort de l'adresse", () => {
    const mail = { ...base, texte: texteDeLongueur(1801) };
    const lien = preparerLienMail(mail);

    expect(construireMailto(mail)).toHaveLength(1801);
    expect(lien.texteACopier).toBe(mail.texte);
    expect(lire(lien.href)).toEqual({
      a: "porteur@club.fr",
      noms: ["cc", "subject"],
      champs: { cc: "c@d.fr", subject: "Objet" },
    });
  });

  it("le seuil porte sur la longueur encodée, pas sur le nombre de caractères", () => {
    // 700 caractères, mais 4 200 une fois encodés.
    const lien = preparerLienMail({ ...base, texte: "é".repeat(700) });

    expect(lien.texteACopier).toHaveLength(700);
  });
});
