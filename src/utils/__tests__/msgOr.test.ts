import { describe, it, expect } from "vitest";
import { msgOr } from "../msgOr";

describe("msgOr", () => {
  it("retourne la valeur quand elle est renseignée", () => {
    expect(msgOr("Un vrai message", "repli")).toBe("Un vrai message");
  });

  it("retourne le repli pour une chaîne vide (bug confirmé : les champs msg* sont '' en base, jamais null)", () => {
    expect(msgOr("", "repli")).toBe("repli");
  });

  it("retourne le repli pour une chaîne composée uniquement d'espaces", () => {
    expect(msgOr("   ", "repli")).toBe("repli");
  });

  it("retourne le repli pour null ou undefined", () => {
    expect(msgOr(null, "repli")).toBe("repli");
    expect(msgOr(undefined, "repli")).toBe("repli");
  });
});
