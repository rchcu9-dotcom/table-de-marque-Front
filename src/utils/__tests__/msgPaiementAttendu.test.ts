import { describe, it, expect } from "vitest";
import { formatFraisInscription, interpolerMsgPaiementAttendu } from "../msgPaiementAttendu";

describe("formatFraisInscription", () => {
  it("formate un montant en euros avec Intl.NumberFormat('fr-FR', {style:'currency', currency:'EUR'})", () => {
    expect(formatFraisInscription(300)).toBe(
      new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(300),
    );
  });
});

describe("interpolerMsgPaiementAttendu", () => {
  it("remplace {{frais}} par le montant formaté (CA1)", () => {
    const result = interpolerMsgPaiementAttendu(
      "Merci de régler {{frais}} avant le tournoi.",
      300,
    );
    expect(result).toBe(`Merci de régler ${formatFraisInscription(300)} avant le tournoi.`);
  });

  it("remplace toutes les occurrences de {{frais}} quand le jeton apparaît plusieurs fois", () => {
    const result = interpolerMsgPaiementAttendu("{{frais}} puis encore {{frais}}", 120);
    const montant = formatFraisInscription(120);
    expect(result).toBe(`${montant} puis encore ${montant}`);
  });

  it("retourne le message inchangé quand {{frais}} est absent (CA2, non-régression)", () => {
    const message = "Paiement attendu, contactez l'organisateur pour tout renseignement.";
    expect(interpolerMsgPaiementAttendu(message, 300)).toBe(message);
  });
});
