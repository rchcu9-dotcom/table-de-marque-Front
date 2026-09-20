import { describe, it, expect } from "vitest";
import { viewFromEtape } from "../inscriptionsSwitchView";

describe("viewFromEtape", () => {
  it.each(["CREEE", "CREATION_NOUVEAU_TOURNOI"] as const)(
    "%s : fermé, « pas encore ouvertes », ouverture sans confirmation",
    (etape) => {
      expect(viewFromEtape(etape)).toEqual({
        checked: false,
        disabled: false,
        label: "Inscriptions fermées",
        hint: "Les inscriptions ne sont pas encore ouvertes.",
        action: "ouvrir",
        confirm: "aucune",
      });
    },
  );

  it("INSCRIPTIONS_OUVERTES : ouvert, fermeture avec modale factuelle", () => {
    expect(viewFromEtape("INSCRIPTIONS_OUVERTES")).toEqual({
      checked: true,
      disabled: false,
      label: "Inscriptions ouvertes",
      hint: "Les équipes peuvent déposer leur candidature.",
      action: "cloturer",
      confirm: "fermeture",
    });
  });

  it("CLOTUREE : fermé, « clôturées », réouverture avec confirmation d'une ligne", () => {
    expect(viewFromEtape("CLOTUREE")).toEqual({
      checked: false,
      disabled: false,
      label: "Inscriptions fermées",
      hint: "Les inscriptions sont clôturées.",
      action: "ouvrir",
      confirm: "reouverture",
    });
  });

  it("TOURNOI_DEMARRE : fermé, désactivé, aucune action", () => {
    expect(viewFromEtape("TOURNOI_DEMARRE")).toEqual({
      checked: false,
      disabled: true,
      label: "Inscriptions fermées",
      hint: "Le tournoi a démarré, les inscriptions ne peuvent plus être rouvertes",
      action: null,
      confirm: null,
    });
  });
});
