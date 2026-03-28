import { describe, it, expect } from "vitest";
import type { Partenaire } from "../../api/partenaire";
import {
  getNamingPartnerForCode,
  buildNamingTitle,
} from "../namingPartners";

// ---------------------------------------------------------------------------
// Données de test
// ---------------------------------------------------------------------------

function makePartner(group: "A" | "B" | "C" | "D", nom: string): Partenaire {
  return {
    id: 1,
    nom,
    logoUrl: null,
    urlSite: null,
    type: "naming",
    namingGroup: group,
    ordre: 1,
  };
}

const PARTNERS: Partenaire[] = [
  makePartner("A", "Al Saj"),
  makePartner("B", "Intermarché"),
  makePartner("C", "Maurice"),
  makePartner("D", "Via Roma"),
];

// ---------------------------------------------------------------------------
// getNamingPartnerForCode
// ---------------------------------------------------------------------------

describe("getNamingPartnerForCode", () => {
  describe("codes J1 (A/B/C/D)", () => {
    it("code A retourne le partenaire du groupe A", () => {
      const result = getNamingPartnerForCode("A", PARTNERS);
      expect(result?.nom).toBe("Al Saj");
    });

    it("code B retourne le partenaire du groupe B", () => {
      const result = getNamingPartnerForCode("B", PARTNERS);
      expect(result?.nom).toBe("Intermarché");
    });

    it("code C retourne le partenaire du groupe C", () => {
      const result = getNamingPartnerForCode("C", PARTNERS);
      expect(result?.nom).toBe("Maurice");
    });

    it("code D retourne le partenaire du groupe D", () => {
      const result = getNamingPartnerForCode("D", PARTNERS);
      expect(result?.nom).toBe("Via Roma");
    });
  });

  describe("codes J2 (Alpha/Beta/Gamma/Delta)", () => {
    it("code Alpha retourne le partenaire du groupe A", () => {
      const result = getNamingPartnerForCode("Alpha", PARTNERS);
      expect(result?.nom).toBe("Al Saj");
    });

    it("code Beta retourne le partenaire du groupe B", () => {
      const result = getNamingPartnerForCode("Beta", PARTNERS);
      expect(result?.nom).toBe("Intermarché");
    });

    it("code Gamma retourne le partenaire du groupe C", () => {
      const result = getNamingPartnerForCode("Gamma", PARTNERS);
      expect(result?.nom).toBe("Maurice");
    });

    it("code Delta retourne le partenaire du groupe D", () => {
      const result = getNamingPartnerForCode("Delta", PARTNERS);
      expect(result?.nom).toBe("Via Roma");
    });
  });

  describe("codes J3 (E/F/G/H)", () => {
    it("code E retourne le partenaire du groupe A", () => {
      const result = getNamingPartnerForCode("E", PARTNERS);
      expect(result?.nom).toBe("Al Saj");
    });

    it("code F retourne le partenaire du groupe B", () => {
      const result = getNamingPartnerForCode("F", PARTNERS);
      expect(result?.nom).toBe("Intermarché");
    });

    it("code G retourne le partenaire du groupe C", () => {
      const result = getNamingPartnerForCode("G", PARTNERS);
      expect(result?.nom).toBe("Maurice");
    });

    it("code H retourne le partenaire du groupe D", () => {
      const result = getNamingPartnerForCode("H", PARTNERS);
      expect(result?.nom).toBe("Via Roma");
    });
  });

  describe("codes inconnus", () => {
    it("code 'Z' retourne null", () => {
      expect(getNamingPartnerForCode("Z", PARTNERS)).toBeNull();
    });

    it("code 'X' retourne null", () => {
      expect(getNamingPartnerForCode("X", PARTNERS)).toBeNull();
    });

    it("code vide '' retourne null", () => {
      expect(getNamingPartnerForCode("", PARTNERS)).toBeNull();
    });
  });

  it("liste vide retourne null", () => {
    expect(getNamingPartnerForCode("A", [])).toBeNull();
  });

  it("partenaire de type 'general' est ignoré même si namingGroup correspond", () => {
    const generalPartner: Partenaire = {
      id: 2,
      nom: "Sponsor Général",
      logoUrl: null,
      urlSite: null,
      type: "general",
      namingGroup: "A",
      ordre: 1,
    };
    expect(getNamingPartnerForCode("A", [generalPartner])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildNamingTitle — pas de partenaire
// ---------------------------------------------------------------------------

describe("buildNamingTitle — pas de partenaire", () => {
  it("code inconnu retourne le titre inchangé", () => {
    expect(buildNamingTitle("Z", "Poule A", PARTNERS)).toBe("Poule A");
  });

  it("liste vide retourne le titre inchangé", () => {
    expect(buildNamingTitle("A", "Poule A", [])).toBe("Poule A");
  });
});

// ---------------------------------------------------------------------------
// buildNamingTitle — J1 (Poule)
// ---------------------------------------------------------------------------

describe("buildNamingTitle — J1 Poule", () => {
  it("'Poule A' devient 'Poule Al Saj A'", () => {
    expect(buildNamingTitle("A", "Poule A", PARTNERS)).toBe("Poule Al Saj A");
  });

  it("'Sam Poule B' devient 'Sam Poule Intermarché B'", () => {
    expect(buildNamingTitle("B", "Sam Poule B", PARTNERS)).toBe(
      "Sam Poule Intermarché B",
    );
  });

  it("'Poule D' devient 'Poule Via Roma D'", () => {
    expect(buildNamingTitle("D", "Poule D", PARTNERS)).toBe("Poule Via Roma D");
  });
});

// ---------------------------------------------------------------------------
// buildNamingTitle — J2 Or
// ---------------------------------------------------------------------------

describe("buildNamingTitle — J2 Tournoi Or", () => {
  it("'Tournoi Or - Alpha' devient 'Or Al Saj'", () => {
    expect(buildNamingTitle("Alpha", "Tournoi Or - Alpha", PARTNERS)).toBe(
      "Or Al Saj",
    );
  });

  it("'Dim - Tournoi Or - Beta' devient 'Dim - Or Intermarché'", () => {
    expect(
      buildNamingTitle("Beta", "Dim - Tournoi Or - Beta", PARTNERS),
    ).toBe("Dim - Or Intermarché");
  });
});

// ---------------------------------------------------------------------------
// buildNamingTitle — J2 Argent
// ---------------------------------------------------------------------------

describe("buildNamingTitle — J2 Tournoi Argent", () => {
  it("'Tournoi Argent - Gamma' devient 'Argent Maurice'", () => {
    expect(
      buildNamingTitle("Gamma", "Tournoi Argent - Gamma", PARTNERS),
    ).toBe("Argent Maurice");
  });

  it("'Dim - Tournoi Argent - Delta' devient 'Dim - Argent Via Roma'", () => {
    expect(
      buildNamingTitle("Delta", "Dim - Tournoi Argent - Delta", PARTNERS),
    ).toBe("Dim - Argent Via Roma");
  });
});

// ---------------------------------------------------------------------------
// buildNamingTitle — J3 Carré Or / Carré Argent
// ---------------------------------------------------------------------------

describe("buildNamingTitle — J3 Carré Or", () => {
  it("'Carré Or A' devient 'Carré Or Al Saj'", () => {
    expect(buildNamingTitle("A", "Carré Or A", PARTNERS)).toBe(
      "Carré Or Al Saj",
    );
  });
});

describe("buildNamingTitle — J3 Carré Argent", () => {
  it("'Carré Argent C' devient 'Carré Argent Maurice'", () => {
    expect(buildNamingTitle("C", "Carré Argent C", PARTNERS)).toBe(
      "Carré Argent Maurice",
    );
  });
});

// ---------------------------------------------------------------------------
// buildNamingTitle — titre non reconnu
// ---------------------------------------------------------------------------

describe("buildNamingTitle — titre non reconnu", () => {
  it("code valide mais titre 'Format inconnu' retourne le titre inchangé", () => {
    expect(buildNamingTitle("A", "Format inconnu", PARTNERS)).toBe(
      "Format inconnu",
    );
  });
});
