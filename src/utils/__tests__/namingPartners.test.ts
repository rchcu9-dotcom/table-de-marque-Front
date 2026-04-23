import { describe, it, expect } from "vitest";
import type { Partenaire } from "../../api/partenaire";
import {
  buildNamingTitle,
  getNamingPartnerForCode,
} from "../namingPartners";

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
  makePartner("B", "Intermarche"),
  makePartner("C", "Maurice"),
  makePartner("D", "Via Roma"),
];

describe("getNamingPartnerForCode", () => {
  it("mappe J1 A/B/C/D", () => {
    expect(getNamingPartnerForCode("A", PARTNERS)?.nom).toBe("Al Saj");
    expect(getNamingPartnerForCode("B", PARTNERS)?.nom).toBe("Intermarche");
    expect(getNamingPartnerForCode("C", PARTNERS)?.nom).toBe("Maurice");
    expect(getNamingPartnerForCode("D", PARTNERS)?.nom).toBe("Via Roma");
  });

  it("mappe J2 E/F/G/H sur les groupes naming historiques", () => {
    expect(getNamingPartnerForCode("E", PARTNERS)?.nom).toBe("Al Saj");
    expect(getNamingPartnerForCode("F", PARTNERS)?.nom).toBe("Intermarche");
    expect(getNamingPartnerForCode("G", PARTNERS)?.nom).toBe("Maurice");
    expect(getNamingPartnerForCode("H", PARTNERS)?.nom).toBe("Via Roma");
  });

  it("mappe J3 I/J/K/L sur les memes groupes naming", () => {
    expect(getNamingPartnerForCode("I", PARTNERS)?.nom).toBe("Al Saj");
    expect(getNamingPartnerForCode("J", PARTNERS)?.nom).toBe("Intermarche");
    expect(getNamingPartnerForCode("K", PARTNERS)?.nom).toBe("Maurice");
    expect(getNamingPartnerForCode("L", PARTNERS)?.nom).toBe("Via Roma");
  });

  it("garde les alias legacy Alpha/Beta/Gamma/Delta", () => {
    expect(getNamingPartnerForCode("Alpha", PARTNERS)?.nom).toBe("Al Saj");
    expect(getNamingPartnerForCode("Beta", PARTNERS)?.nom).toBe("Intermarche");
    expect(getNamingPartnerForCode("Gamma", PARTNERS)?.nom).toBe("Maurice");
    expect(getNamingPartnerForCode("Delta", PARTNERS)?.nom).toBe("Via Roma");
  });
});

describe("buildNamingTitle", () => {
  it("enrichit les libelles J1", () => {
    expect(buildNamingTitle("A", "Sam Poule A", PARTNERS)).toBe("Sam Poule Al Saj A");
  });

  it("enrichit les libelles J2 selon la nouvelle convention", () => {
    expect(buildNamingTitle("E", "Dim - Or E", PARTNERS)).toBe("Dim - Or Al Saj");
    expect(buildNamingTitle("G", "Dim - Argent G", PARTNERS)).toBe("Dim - Argent Maurice");
  });

  it("enrichit les libelles J3 selon la nouvelle convention", () => {
    expect(buildNamingTitle("I", "Carré Or 1", PARTNERS)).toBe("Carré Or Al Saj 1");
    expect(buildNamingTitle("K", "Carré Argent 9", PARTNERS)).toBe("Carré Argent Maurice 9");
  });

  it("reste compatible avec les anciens labels encore remontes", () => {
    expect(buildNamingTitle("Alpha", "Tournoi Or - Alpha", PARTNERS)).toBe("Or Al Saj");
    expect(buildNamingTitle("I", "Or 1-4", PARTNERS)).toBe("Or Al Saj 1-4");
    expect(buildNamingTitle("I", "Carré Or A", PARTNERS)).toBe("Carré Or Al Saj");
  });

  it("laisse intact un titre inconnu", () => {
    expect(buildNamingTitle("Z", "Format inconnu", PARTNERS)).toBe("Format inconnu");
  });
});
